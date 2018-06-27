'use strict';

import * as path from 'path';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { IVisualCodeDocumentShim } from '../models/interfaces/vs-code-document-shim';
import { PHPFileParserService } from './php-file-parser-service';
import { PHPEntityInfo } from '../models/php-entity-info';
import { PHPFunctionInfo } from '../models/php-function-info';
import { PHPUtility } from '../services/php-utility';
import { SpawnService } from './spawn-service';
import { PHPTestFunctionInfo } from '../models/php-test-function-info';

/**
 * This class includes functionality to run unit tests and trigger Visual Code
 * feedback on success/failure
 */
export class PHPUnitTestRunnerService {

    private _ui: IVisualCodeShim;
    private _parser: PHPFileParserService;
    private _spawn: SpawnService;
    private _testSubdirectory: string;
    private _runCommand: string;
    private _runAllCommand: string;
    private _runCodeCoverageCommand: string;
    private _codeCoverageReport: string;
    private _runDirectory: string;

    constructor(ui: IVisualCodeShim, parser: PHPFileParserService, spawn: SpawnService) {
        this._ui = ui;
        this._parser = parser;
        this._spawn = spawn;
        this._testSubdirectory = ui.configuration.testSubdirectory;
        this._runCommand = ui.configuration.commands.runUnitTest;
        this._runAllCommand = ui.configuration.commands.runAllUnitTests;
        this._runCodeCoverageCommand = ui.configuration.commands.runCodeCoverage;
        this._codeCoverageReport = ui.configuration.commands.codeCoverageReport;
        this._runDirectory = ui.configuration.commands.directory;
    }
    /**
     * Parse out the test function from the comment
     * @param comment 
     * @param editor 
     * @returns PHPTestFunctionInfo | undefined
     */
    protected getTestFunctionInfo(entity: PHPEntityInfo, document: IVisualCodeDocumentShim): PHPTestFunctionInfo | undefined {
        if(entity) {
            let functionName = undefined;
            let disableAutoRun = false;
            if(entity.comment) {
                const comment = entity.comment;
                for(let lineNo = comment.startLineNumber; lineNo <= comment.endLineNumber; lineNo++) {
                    const line = document.getLineTextAt(lineNo);
                    const matches = /@testFunction\s*(\S*)/g.exec(line);
                    if(matches && matches.length > 0) {
                        functionName = matches[1];
                    }
                    const matchesNoAutoRun = /@testDisableAutoRun/g.exec(line);
                    if(matchesNoAutoRun && matchesNoAutoRun.length > 0) {
                        disableAutoRun = true;
                    }
                }
            }
            return new PHPTestFunctionInfo(entity, disableAutoRun, functionName);
        }
        return undefined;
    }

    /**
     * For the given PHP entity, return a default test function name
     * @param entity 
     * @returns string
     */
    getDefaultTestFunctionName(entity: PHPEntityInfo) {
        if(entity instanceof PHPFunctionInfo && entity.class) {
             return 'test' + PHPUtility.capitalizeFirstLetter(entity.class.name) + PHPUtility.capitalizeFirstLetter(entity.name);
        } else {
            return 'test' + PHPUtility.capitalizeFirstLetter(entity.name);
        }
    }
    
    /**
     * Get the current entity associated test function (if any) selected in the given editor
     * @param document 
     * @returns PHPTestFunctionInfo|undefined
     */
    async getCurrentTestFunction(document: IVisualCodeDocumentShim): Promise<PHPTestFunctionInfo|undefined> {
        const me = this;
        const text = document.getAllText();
        const entity = await this._parser.getEntityAtLineNumber(text, document.getSelectionStart().line + 1);
        if(entity && entity.testable) {
            return me.getTestFunctionInfo(entity, document);
        } else {
            return undefined;
        }
    }

    /**
     * For the given range of numbers, get a list of any test functions to run
     * (used by autorun)
     * @param document
     * @param lineNumbers 
     */
    async getLineTestFunctions(document: IVisualCodeDocumentShim, lineNumbers: Array<number>): Promise<Array<PHPTestFunctionInfo>> {
        const me = this;
        const text = document.getAllText();
        const results: Array<PHPTestFunctionInfo> = [];
        for(let lineNumber of lineNumbers) {
            let result = await this._parser.getEntityAtLineNumber(text, lineNumber + 1);
            if(result instanceof PHPEntityInfo && result.testable) {
                const functionInfo = me.getTestFunctionInfo(result, document);
                if(functionInfo) {
                    let add = true;
                    for(let info of results) {
                        if(info.functionName === functionInfo.functionName) {
                            add = false;
                            break;
                        }
                    }
                    if(add) {
                        results.push(functionInfo);
                    }
                }
            }
        }
        return results;
    }

    /**
     * Run the specified unit test function, optionally with code coveage
     * @param workspaceDirectory
     * @param functionName 
     * @param withCodeCoverage 
     */
    async runUnitTest(workspaceDirectory: string, functionName?: string, withCodeCoverage=false): Promise<void> {
        try {
            workspaceDirectory = path.normalize(workspaceDirectory);
            const options = {
                "__FUNCTION__": '',
                "__TEST_SUBDIRECTORY__": path.normalize(this._testSubdirectory).replace(/\\/g, '\/'),
                "__TEST_DIRECTORY__": path.normalize(path.join(workspaceDirectory, this._testSubdirectory)).replace(/\\/g, '\/'),
                "__WORKSPACE_DIRECTORY__": workspaceDirectory
            };

            let cmd: string;
            let startIn: string;
            let msg: string;

            if(functionName) {
                options.__FUNCTION__ = functionName;
                cmd = PHPUtility.substituteValues(this._runCommand, options);
                msg = "Running unit test " + functionName;
            } else {
                if(withCodeCoverage) {
                    cmd = PHPUtility.substituteValues(this._runCodeCoverageCommand, options);
                } else {
                    cmd = PHPUtility.substituteValues(this._runAllCommand, options);
                }
                msg = "Running all unit tests";
            }
            startIn = PHPUtility.substituteValues(this._runDirectory, options);

            this._ui.appendToOutputChannel("*** " + msg + " ***");
            
            this._ui.appendToOutputChannel("Command \"" + cmd + "\"");

            const output = await this._spawn
                .setCommandWithArguments(cmd)
                .setStartInDirectory(startIn)
                .run();
            if(output.indexOf("No tests executed") !== -1) {
                throw new Error("Unit testing was not executed, check your definition");
            }

            if(withCodeCoverage && this._codeCoverageReport) {
                this._spawn
                    .setStartInDirectory(workspaceDirectory)
                    .launchFile(PHPUtility.substituteValues(this._codeCoverageReport, options));
            }
        } catch(e) {
            throw e;
        }
    }
}
