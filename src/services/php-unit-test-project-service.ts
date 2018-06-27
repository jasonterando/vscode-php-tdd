'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { PHPUtility } from '../services/php-utility';
import { IVisualCodeDocumentShim } from '../models/interfaces/vs-code-document-shim';

export class PHPUnitTestProjectService {
    
    private _ui: IVisualCodeShim;
    private _workspaceFolderPaths: Array<string>;
    private _testSubdirectory: string;
    private _sourceSubdirectory: string;

    constructor(ui: IVisualCodeShim, sourceSubdirectory: string) {
        this._ui = ui;
        this._workspaceFolderPaths = ui.getWorkspaceFolderPaths();
        this._testSubdirectory = ui.configuration.testSubdirectory;
        this._sourceSubdirectory = sourceSubdirectory;
    }

    /**
     * Returns the full unit test path, and if it exists, that applies to the specified file
     * @param document
     */
    getInfoForDocument(document: IVisualCodeDocumentShim): PHPUnitTestProjectInfo {
        let fullFileName = document.getFullPath();
        let fileDirectory = path.dirname(fullFileName);
        for(let workspaceFolderPath of this._workspaceFolderPaths) {
            if(fileDirectory.indexOf(workspaceFolderPath) === 0) {
                return new PHPUnitTestProjectInfo(path.normalize(path.join(workspaceFolderPath, this._testSubdirectory)),
                    path.normalize(workspaceFolderPath));
            }
        }
        throw new Error("Unable to associated document with a workspace folder, make sure it is saved to a workspace folder");
    }

    /**
     * Get the full test path for the default (only) workspace folder; if there is more than one,
     * prompt the user (return undefined if not picked)
     */
    async getInfoForWorkspaceFolder() : Promise<PHPUnitTestProjectInfo | undefined> {
        switch(this._workspaceFolderPaths.length) {
            case 0:
                throw new Error("Workspace must have folders for unit testing");
            case 1:
                const workspaceFolderPath = this._workspaceFolderPaths[0];
                return new PHPUnitTestProjectInfo(
                    path.normalize(path.join(workspaceFolderPath, this._testSubdirectory)),
                    path.normalize(workspaceFolderPath));
            default:
                let pickList = this._workspaceFolderPaths.map((wsPath) => { 
                    return { label: path.basename(wsPath), description: wsPath };
                });
                const f = await this._ui.showPickList(pickList);
                if(f && f.description) {
                    return new PHPUnitTestProjectInfo(
                        path.normalize(path.join(f.description, this._testSubdirectory)),
                        path.normalize(f.description));
                } else {
                    return undefined;
                }
                break;
        }
    }

    /**
     * Retrieve or create the unit test directory for the *workspace* associated with the
     * gieven document; also copying the base test case (if applicable)
     * @param documentUri 
     * @return string 
     */
    async createUnitTestDirectory(unitTestDirectoryPath: string): Promise<void> {
        if(fs.existsSync(unitTestDirectoryPath)) {
            this._ui.appendToOutputChannel("*** Removing existing unit test project directory ***");
            try {
                await PHPUtility.rimraf(unitTestDirectoryPath);
            } finally {
                this._ui.hideStatusBarMessage();
            }
        }

        PHPUtility.mkdirDeep(path.join(unitTestDirectoryPath, 'cases'));

        // Copy in source files, if configured
        if(this._sourceSubdirectory) {
            let sourceFolder = path.join(path.dirname(__dirname), this._sourceSubdirectory);
            if(! fs.existsSync(sourceFolder)) {
                throw new Error("Unable to set up test directory: " + sourceFolder + " does not exist");
            }

            // Copy all the files in the source directory to the new directory
            this._ui.appendToOutputChannel("*** Copying unit test project files ****");
            try {
                let copyPromises = [];
                let files = fs.readdirSync(sourceFolder);
                for(let file of files) {
                    var source = path.join(sourceFolder, file);
                    if(fs.statSync(source).isFile) {
                        var dest = path.join(unitTestDirectoryPath, file);
                        copyPromises.push(new Promise(function(resolve, reject) {
                            fs.createReadStream(source).pipe(fs.createWriteStream(dest))
                                .on('finish', () => { resolve(); })
                                .on('error', (err: any) => { reject(err); });

                        }));
                    }
                }
                await Promise.all(copyPromises).catch((err: any) => { throw new Error(err); });
            } finally {
                this._ui.hideStatusBarMessage();
            }
        }
    }
}

export class PHPUnitTestProjectInfo {
    private _unitTestPath: string;
    private _unitTestPathExists: boolean;
    private _workspacePath: string;

    constructor(unitTestPath: string, workspacePath: string) {
        this._unitTestPath = unitTestPath;
        this._unitTestPathExists = fs.existsSync(unitTestPath);
        this._workspacePath = workspacePath;
    }

    get unitTestPath(): string {
        return this._unitTestPath;
    }

    get unitTestPathExists(): boolean {
        return this._unitTestPathExists;
    }

    get workspacePath() : string {
        return this._workspacePath;
    }
}

