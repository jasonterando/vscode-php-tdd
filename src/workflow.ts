'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import { IVisualCodeShim } from './models/interfaces/vs-code-shim';
import { PHPTestFunctionInfo } from './models/php-test-function-info';
import { PHPUnitTestRunnerService } from './services/php-unit-test-runner-service';
import { PHPDocumentEditorService } from './services/php-document-editor-service';
import { PHPUnitTestProjectService, PHPUnitTestProjectInfo } from './services/php-unit-test-project-service';
import { PHPUnitTestBuilderService } from './services/php-unit-test-builder-service';
import { VisualCodeDocumentShim } from './models/vs-code-document-shim';
import { ComposerSetupService } from './services/composer-setup-service'; 
import { IVisualCodeDocumentShim } from './models/interfaces/vs-code-document-shim';

export class Workflow {
    private _ui: IVisualCodeShim;
    private _project: PHPUnitTestProjectService;
    private _runner: PHPUnitTestRunnerService;
    private _editor: PHPDocumentEditorService;
    private _builder: PHPUnitTestBuilderService;
    private _composer: ComposerSetupService;
    private _packagesRequired: Array<string>;
    private _packagesDevelopment: Array<string>;

    constructor (ui: IVisualCodeShim, project: PHPUnitTestProjectService, runner: PHPUnitTestRunnerService, 
        editor: PHPDocumentEditorService, builder: PHPUnitTestBuilderService, composer: ComposerSetupService) {
        this._ui = ui;
        this._project = project;
        this._runner = runner;
        this._editor = editor;
        this._builder = builder;
        this._composer = composer;
        this._packagesRequired = ui.configuration.composer.packagesRequired;
        this._packagesDevelopment = ui.configuration.composer.packagesDevelopment;
    }

    private static _lastRunMS = 0;
    private static _runQueue = new Array<TestUnitQueueItem>(); 
    async onDocumentChanged(e: vscode.TextDocumentChangeEvent) {
        var me = this;

        function checkQueue() {
            const now = Date.now();
            if(now - Workflow._lastRunMS > 2000) {
                const runQueueItems = Workflow._runQueue.slice();
                let functionsRun = [];
                for(let r of runQueueItems) {
                    const functionName = r.functionInfo.functionName;
                    if(functionsRun.indexOf(functionName) === -1) {
                        functionsRun.push(functionName);
                        // console.log("Running " + functionName);
                        me.doRunUnitTest(r.document, r.functionInfo, r.projectInfo);    
                    } else {
                        // console.log("Skipping " + functionName);
                    }
                }
                Workflow._runQueue = [];
                Workflow._lastRunMS = now;
            }
            if(Workflow._runQueue.length > 0) {
                setTimeout(() => {
                    checkQueue();
                }, 500);
            }
        }
        
        const editor = vscode.window.activeTextEditor;
        if(! editor) {
            return;
        }
        if(editor.document.isUntitled || (e.document !== editor.document)) {
            return;
        }

        const activeDocument = new VisualCodeDocumentShim(editor.document, editor);

        const projectInfo = this._project.getInfoForDocument(activeDocument);
        if(! projectInfo.unitTestPathExists) {
            return;
        }

        let lineNumbers: Array<number> = [];
        for(let change of e.contentChanges) {
            for(let lineNo = change.range.start.line; lineNo <= change.range.end.line; lineNo++) {
                if(lineNumbers.indexOf(lineNo) === -1) {
                    lineNumbers.push(lineNo);
                }
            }
        }
        
        const document = new VisualCodeDocumentShim(e.document);
        let functions = await this._runner.getLineTestFunctions(document, lineNumbers);
        for(let f of functions) {
            if(f.hasTestFunction && (! f.disableAutoRun)) {
                Workflow._runQueue.push(new TestUnitQueueItem(document, f, projectInfo));
                // console.log("Pushing " + f.functionName);
            }
        }
        
        checkQueue();
    }

    async createUnitTestDirectory() {
        const info = vscode.window.activeTextEditor 
            ? this._project.getInfoForDocument(new VisualCodeDocumentShim(
                vscode.window.activeTextEditor.document,
                vscode.window.activeTextEditor))
            : await this._project.getInfoForWorkspaceFolder();
        if(! info) {
            return;
        }

        const workspaceInfo = info;
        if(info.unitTestPathExists) {
            if(! await new Promise((resolve, reject) => {
                try {
                    vscode.window.showQuickPick(["Cancel (leave \"" + workspaceInfo.unitTestPath + "\" as-is)",
                        "Delete and recreate unit test folder for \"" + workspaceInfo.unitTestPath + "\"?" 
                    ], {canPickMany: false}).then(async (x) => {
                        resolve(x && x[0] === 'D');
                    });
                } catch(e) {
                    reject(e);
                }
            })) {
                return;
            }
        }

        let msg: string;
        try {
            this._ui.appendToOutputChannel("Setting up unit test project");
            this._ui.showOutputChannel();
            await this._project.createUnitTestDirectory(workspaceInfo.unitTestPath);
            if(this._packagesRequired.length + this._packagesDevelopment.length > 0) {
                await this._composer.checkRequirements(workspaceInfo.workspacePath, 
                    this._packagesRequired, this._packagesDevelopment);
            }
            await this._composer.assignNamespace('PHPTDD', 
                path.relative(workspaceInfo.workspacePath, workspaceInfo.unitTestPath),
                workspaceInfo.workspacePath);   
            msg = "Workspace is ready for unit testing";
            this._ui.showInformationMessage(msg);
        } catch(e) {
            msg = "Problems were encountered preparing the workspace for unit testing";
            this._ui.appendToOutputChannel(e.toString());
            this._ui.showWarningMessage(msg);
        }
        this._ui.appendToOutputChannel("*** " + msg + " ***");
    }

    protected async doEditUnitTest(functionInfo: PHPTestFunctionInfo, document: IVisualCodeDocumentShim) {
        let testFunctionName: string;
    
        const projectInfo = this._project.getInfoForDocument(document);
        if(! projectInfo.unitTestPathExists) {
            await this.createUnitTestDirectory();
        }
    
        if(functionInfo.hasTestFunction) {
            testFunctionName = functionInfo.functionName;
        } else {
            const defaultName = this._runner.getDefaultTestFunctionName(functionInfo.entity);
            const i = defaultName.length;
            const inputResult = await vscode.window.showInputBox({prompt: "Enter name of test method for " + 
                functionInfo.entity.name, value: defaultName, valueSelection: [i,i]});
            if(! inputResult) {
                return;
            }
            testFunctionName = inputResult;
            this._editor.addTestFunction(testFunctionName, functionInfo.entity, document);
        }   
        await this._builder.editUnitTestFunction(testFunctionName, functionInfo.entity, 
            document.getFullPath(), projectInfo.workspacePath);
    }

    async editUnitTest(document: IVisualCodeDocumentShim) {
        if(document.isUntitled) {
            this._ui.showWarningMessage("Source file must be saved and named before creating unit tests for it");
            return;
        }

        const info = await this._runner.getCurrentTestFunction(document);
        if(info) {
            await this.doEditUnitTest(info, document);
        } else {
            this._ui.showWarningMessage("Cursor is not on a testable entity");
        }
    }

    async editLastUnitTest(document: IVisualCodeDocumentShim) {
        if(this._ui.lastTestFunctionInfo) {
            await this.doEditUnitTest(this._ui.lastTestFunctionInfo, document);
        }
    }

    private async doRunUnitTest(document: IVisualCodeDocumentShim, functionInfo: PHPTestFunctionInfo, projectInfo: PHPUnitTestProjectInfo) { 
        try {
            this._ui.clearDiagnostics(document, functionInfo.entity.identifier);
            await this._runner.runUnitTest(projectInfo.workspacePath, functionInfo.functionName);
            // this._ui.addDiagnostic(editor.document, info.entity.identifier, range, 
            //     "Unit test passed", vscode.DiagnosticSeverity.Information
            // );
        } catch(e) {
            this._ui.addDiagnostic(document, functionInfo.entity.identifier, 
                functionInfo.entity.startLineNumber - 1, 
                document.getLineFirstNonWhitespaceCharacterIndex(functionInfo.entity.startLineNumber - 1),
                functionInfo.entity.endLineNumber - 1, 
                document.getLineTextAt(functionInfo.entity.endLineNumber - 1).length,
                "Unit test failed"
            );
            throw e;
        }
    }

    async runUnitTest(document: IVisualCodeDocumentShim) {
        if(document.isUntitled) {
            this._ui.showWarningMessage("Source file must be saved and named before creating unit tests for it");
            return;
        }

        const info = await this._runner.getCurrentTestFunction(document);
        if(info) {
            const projectInfo = this._project.getInfoForDocument(document);
            if(info.hasTestFunction && projectInfo.unitTestPathExists) {
                try {
                    this._ui.lastTestFunctionInfo = info;
                    this._ui.showStatusBarMessage("$(clock) Running unit test...");
                    await this.doRunUnitTest(document, info, projectInfo);
                    this._ui.showStatusBarMessage("$(check) Unit test passed for " + info.entity.name, 
                    "Edit unit test " + info.functionName, "phptdd.editLastUnitTest");
                } catch(e) {
                    // this._ui.outputChannel.show();
                    this._ui.showStatusBarMessage("$(circle-slash) Unit test failed for " +  info.entity.name,
                        "Edit unit test " + info.functionName, "phptdd.editLastUnitTest");
                }
            } else {
                this._ui.lastTestFunctionInfo = undefined;
                await this.doEditUnitTest(info, document);
            }
        } else {
            this._ui.lastTestFunctionInfo = undefined;
            this._ui.showStatusBarMessage("$(stop) Cursor is not on a testable entity");
        }
    }

    async runAllUnitTests(withCodeCoverage: boolean) {
        const info = await this._project.getInfoForWorkspaceFolder();
        if(! info) {
            return;
        }
        try {
            await this._runner.runUnitTest(info.workspacePath, '', withCodeCoverage);
            this._ui.showInformationMessage("Unit tests passed");
            this._ui.showOutputChannel();
        } catch(e) {
            this._ui.showWarningMessage("Unit tests failed");
            this._ui.showOutputChannel();
        }
    }    
}

class TestUnitQueueItem {
    constructor(document: IVisualCodeDocumentShim, functionInfo: PHPTestFunctionInfo, projectInfo: PHPUnitTestProjectInfo) {
        this.document = document;
        this.functionInfo = functionInfo;
        this.projectInfo = projectInfo;
    }
    readonly document: IVisualCodeDocumentShim;
    readonly functionInfo: PHPTestFunctionInfo;
    readonly projectInfo: PHPUnitTestProjectInfo;
}