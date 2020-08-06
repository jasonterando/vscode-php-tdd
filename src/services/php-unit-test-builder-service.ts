'use strict';

import * as path from 'path';
import * as fs from 'fs';
import { PHPFileParserService } from './php-file-parser-service';
import { ComposerSetupService } from './composer-setup-service';
import { PHPEntityInfo } from '../models/php-entity-info';
import { PHPClassInfo } from '../models/php-class-info';
import { PHPFunctionInfo } from '../models/php-function-info';
import { PHPUseInfo } from '../models/php-use-info';
import { PHPUtility } from '../services/php-utility';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { VisualCodePositionShim } from '../models/vs-code-position-shim';
import { IVisualCodeDocumentShim } from '../models/interfaces/vs-code-document-shim';
import { IVisualCodePositionShim } from '../models/interfaces/vs-code-position-shim';

export class PHPUnitTestBuilderService {

    private _ui: IVisualCodeShim;
    private _parser: PHPFileParserService;
    private _composer: ComposerSetupService;
    private _unitTestPath: string;
    private _unitTestTemplateFile: string;

    constructor(ui: IVisualCodeShim, parser: PHPFileParserService, composer: ComposerSetupService) {
        this._ui = ui;
        this._parser = parser;
        this._composer = composer;
        this._unitTestPath = ui.configuration.testSubdirectory;
        this._unitTestTemplateFile = ui.configuration.testClassTemplateFile;
    }

    /**
     * Displays unit test to edit, opening it in editor
     * @param functionName 
     * @param entity 
     * @param documentPath 
     * @param workspaceFolderPath
     */
    async editUnitTestFunction(functionName: string, useBaseTestCase: boolean, entity: PHPEntityInfo, documentPath: string, workspaceFolderPath: string) {
        let testFileInfo = this.getUnitTestFileNameInfo(documentPath);
        let contents: string;
        if(fs.existsSync(testFileInfo.filename)) {
            contents = fs.readFileSync(testFileInfo.filename).toString();
        } else {
            contents = await this.createTestFile(testFileInfo.filename, useBaseTestCase, documentPath, testFileInfo.relativePath);
        }

        let entities = await this._parser.getEntities(contents);
        let testInfo = await this.getTestMethodLine(entities, functionName);
        let document = await this._ui.openDocument(testFileInfo.filename);
        
        let startPos, endPos: VisualCodePositionShim;
        if(testInfo.exists) {
            const character = document.getLineFirstNonWhitespaceCharacterIndex(testInfo.lineNumber);
            startPos = endPos = new VisualCodePositionShim(testInfo.lineNumber, character);
        } else {
            let results = await this.addTestFunction(functionName, testInfo.lineNumber - 1, entity, document);
            startPos = results[0];
            endPos = results[1];
        }
        document.setSelection(startPos, endPos);

        let useEntities = entities.filter(function(entity) {
            return entity instanceof PHPUseInfo;
        });

        this.checkNamespace(entity, useEntities, document);
        this._composer.assignNamespace(entity.namespace, 
            path.dirname(documentPath),
            workspaceFolderPath
        );
    }

    /**
     * Gets the name and relative path (namespace) of the unit test file for the specified file
     * @param documentPath
     * @param unitTestDirectory
     * @returns object - filename and relativePath (relative path within workspace) 
     */
    protected getUnitTestFileNameInfo(documentPath: string) {
        const sep = path.sep;
        let fileDirectory = path.dirname(documentPath);
        if(! fileDirectory.endsWith(sep)) {
            fileDirectory += sep;
        }
        for(let workspaceFolderPath of this._ui.getWorkspaceFolderPaths()) {
            if(fileDirectory.indexOf(workspaceFolderPath) === 0) {
                let segment = fileDirectory.substring(workspaceFolderPath.length);
                let idx = segment.indexOf(sep, (segment[0] === sep) ? 1 : 0);
                if(idx !== -1) {
                    let testDirectory = path.join(workspaceFolderPath, this._unitTestPath, segment);
                    PHPUtility.mkdirDeep(testDirectory);

                    // Figure out the name of the test file
                    let testFile = path.join(testDirectory, path.basename(documentPath));
                    let ext = path.extname(testFile);
                    testFile = testFile.substring(0, testFile.length - ext.length) + 'Test.php';

                    return {
                        filename: testFile,
                        relativePath: segment
                    };
                }
            }
        }
        throw new Error("Unable to determine unit test directory, make sure that a PHP document is open in a workspace");
    }

    /**
     * Create a unit test file
     * @param testFileName
     * @param useBaseTest - if true, use PHPTDD's BaseTest class, otherwise, use PHPUnit TestCase
     * @param sourceFileName
     * @param relativeDirectory
     */
    protected async createTestFile(testFileName: string, useBaseTest: boolean, sourceFileName: string, relativeDirctory: string) {
        // Get the name of the template to use
        if(this._unitTestTemplateFile) {
            const templateFile = path.join(path.dirname(__dirname), this._unitTestTemplateFile);
            if(! fs.existsSync(templateFile)) {
                throw new Error("Unable to set up test case: " + templateFile + " does not exist");
            }

            // Copy the template as the new unit test file
            await new Promise(function(resolve, reject) {
                fs.createReadStream(templateFile).pipe(fs.createWriteStream(testFileName))
                    .on('finish', () => { resolve(); })
                    .on('error', (err: any) => { reject(err); });
            });

            // Class name is based upon the file name preceded by test
            let testCaseClassName =  PHPUtility.capitalizeFirstLetter(path.basename(sourceFileName));
            let cext = path.extname(testCaseClassName);
            if(cext.length > 0) {
                testCaseClassName = testCaseClassName.substring(0, testCaseClassName.length - cext.length);
            }
            testCaseClassName += "Test";

            // Update the namespace and class name
            let contents = fs.readFileSync(testFileName).toString();
            let namespace = relativeDirctory.replace(/\//g, '\\').replace(/\-/g, '_');
            if(namespace[0] !== '\\') {
                namespace = '\\' + namespace;
            }
            namespace = this.validateNamespace(namespace);
            if (namespace.endsWith('\\')) {
                namespace = namespace.substr(0, namespace.length - 1);
            }

            let testUseClass: string;
            let testClass: string;

            if (useBaseTest) {
                testUseClass = "PHPTDD\\BaseTestCase";
                testClass = "BaseTestCase";
            } else {
                testUseClass = "PHPUnit\\Framework\\TestCase";
                testClass = "TestCase";
            }

            contents = contents
                .replace("__TestNamespace__", namespace)
                .replace("__TestCaseClassName__", testCaseClassName)
                .replace("__TestUseClass__", testUseClass)
                .replace("__TestClass__", testClass);

            fs.writeFileSync(testFileName, contents);

            return contents;
        } else {
            return "";
        }
    }

    /**
     * Returns the line number of where the test function exists, or where it needs to be added
     * @param testFileName 
     * @param functionName 
     */
    protected async getTestMethodLine(entities: Array<PHPEntityInfo>, testFunctionName: string) {
        let firstClass: PHPClassInfo | undefined = undefined;
        for(let entity of entities) {
            if(entity instanceof PHPFunctionInfo) {
                if(entity.name === testFunctionName) {
                    return {
                        lineNumber: entity.startLineNumber,
                        exists: true
                    };
                }
            } else if(entity instanceof PHPClassInfo) {
                for(let f of entity.functions) {
                    if(f.name === testFunctionName) {
                        return {
                            lineNumber: f.startLineNumber,
                            exists: true
                        };
                    }
                }
                if(! firstClass) {
                    firstClass = entity;
                }
            }
        }

        if(firstClass) {
            return {
                lineNumber: firstClass.endLineNumber,
                exists: false
            };
        } else {
            throw new Error("No test class was found");
        }
    }

    /**
     * Add a test function to the document in editor, returns what should be highlighted (startPos & endPos)
     * @param testFunctionName 
     * @param lineNumber 
     * @param editor 
     * @returns Array<vscode.Position>
     */
    protected async addTestFunction(testFunctionName: string, lineNumber: number, 
        entity: PHPEntityInfo, document: IVisualCodeDocumentShim) : Promise<Array<IVisualCodePositionShim>> {
        let eol = document.eol;
        // Go back and find the previous line with something on it, use that for white space
        let padding = '';
        let backToLineNumber = lineNumber;
        while(--backToLineNumber > 0) {
            let pastLineText = document.getLineTextAt(backToLineNumber);
            if(pastLineText.length > 0) {
                let startAt = document.getLineFirstNonWhitespaceCharacterIndex(backToLineNumber);
                padding = pastLineText.substring(0, startAt);
                break;
            }
        }

        let covers = "";
        let yOffset: number;
        if(entity instanceof PHPFunctionInfo) {
            covers = eol + padding + "/**" + eol + padding + " * @covers " + 
                (entity.class ? (entity.class.fullName + '::' + entity.name) : entity.fullName) + eol + padding + " **/";
            yOffset = 5;
        } else if (entity instanceof PHPClassInfo) {
            covers = eol + padding + "/**" + eol + padding + " * @covers " + entity.fullName + eol + padding + " **/";
            yOffset = 5;
        } else {
            yOffset = 2;
        }

        await document.insertText(lineNumber, 0, 
            covers + eol + padding + "public function " + testFunctionName + "() {" + eol + padding + padding + "// code test functionality here" + eol + padding + "}" + eol
        );

        let currentLineNumber = lineNumber + yOffset;
        return [
            new VisualCodePositionShim(currentLineNumber, document.getLineFirstNonWhitespaceCharacterIndex(currentLineNumber)),
            new VisualCodePositionShim(currentLineNumber, document.getLineTextAt(currentLineNumber).length)
        ];
    }

    /**
     * Returns a namespace that should be valid
     * @param namespace 
     */
    protected validateNamespace(namespace: string) : string {
        let parts = namespace.split('\\');
        for(let i in parts) {
            let part = parts[i];
            if(part.length === 0) {
                continue;
            }
            part = part.replace(/[^a-zA-Z0-9_\x7f-\xff]/g, '_');
            if(! /^[a-zA-Z_\x7f-\xff]/.test(part)) {
                part = 'ns_' + part;
            }
            parts[i] = part;
        }
        return parts.join('\\');
    }

    protected async checkNamespace(entity: PHPEntityInfo, useEntities: Array<PHPUseInfo>, document: IVisualCodeDocumentShim)
    {
        let namespace: string;
        if(entity instanceof PHPFunctionInfo && entity.class instanceof PHPClassInfo) {
            if(entity.class.namespace) {
                namespace = entity.class.namespace ? (entity.class.namespace + '\\' + entity.class.name) : entity.class.name;
            } else {
                namespace = entity.class.name;
            }
        } else {
            if(entity.namespace) {
                namespace = entity.namespace ? (entity.namespace + '\\' + entity.name) : entity.name;
            } else {
                namespace = entity.name;
            }
        }

        let highestUseEntityLine = 1;
        let needToAddNamespace = true;
        for(let useEntity of useEntities) {
            if(useEntity.endLineNumber > highestUseEntityLine) {
                highestUseEntityLine = useEntity.endLineNumber;
            }
            if(useEntity.namespace === namespace) {
                needToAddNamespace = false;
            }
        }

        if(needToAddNamespace) {
            await document.insertText(highestUseEntityLine, 0, 
                "use " + namespace + ";" + document.eol
            );
        }
    }
}
