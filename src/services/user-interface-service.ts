'use strict';

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { PHPTestFunctionInfo } from '../models/php-test-function-info';

/**
 * This class handles stateful functionality for VSCode workspaces
 */
export class UserInterfaceService extends vscode.Disposable {
    // Status bar entry that will be used to display info
    private _statusBar: vscode.StatusBarItem;
    // Output channel that PHP-TDD will send trace information to
    private _output: vscode.OutputChannel | undefined = undefined;
    // Diagnostic list that will be used to show unit test failures
    private _diagnosticList: Array<vscode.Diagnostic> = [];
    private _diagnostics: vscode.DiagnosticCollection | undefined = undefined;
    // Event listener fordocument changes
    private _autoRunPolling: vscode.Disposable | undefined = undefined;
    // Outbound emitter when a PHP document changes
    private _onPHPDocumentChanged = new EventEmitter();
    // Last test function we ran and may want to edit
    private _lastFunctionInfo: PHPTestFunctionInfo | undefined = undefined;

    constructor(enableAutoRun: boolean)  {
        super(() => {
            // Clean up after ourselves (Disposable implementation)
            this._statusBar.dispose();
            if(this._output) {
                this._output.dispose();
                this._output = undefined;
            }
            if(this._diagnostics) {
                this._diagnostics.dispose();
                this._diagnostics = undefined;
            }
            if(this._autoRunPolling) {
                this._autoRunPolling.dispose();
                this._autoRunPolling = undefined;
            }
        });

        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

        // Watch for configuration changes (currently, just for autoRunPolling auto-run config)
        vscode.workspace.onDidChangeConfiguration(e => {
            this.onConfigChange(e);
        });

        this.autoRunPolling = enableAutoRun;
    }

    /**
     * If enableAutoRun is changed, update our autoRunPolling
     * @param e 
     */
    onConfigChange(e: vscode.ConfigurationChangeEvent) {
        if(e.affectsConfiguration('php-tdd')) {
            this.autoRunPolling = vscode.workspace.getConfiguration("php-tdd")['runUnitTest']['enableAutoRun'];
        }
    }

    /**
     * Return our even emitter for PHP document chages
     */
    get onPHPDocumentChanged() {
        return this._onPHPDocumentChanged;
    }

    get autoRunPolling() {
        return this._autoRunPolling !== undefined;
    }

    set autoRunPolling(value: boolean) {
        if((this._autoRunPolling !== undefined) === value) {
            return;
        }
        if(this._autoRunPolling) {
            this._autoRunPolling.dispose();
            this._autoRunPolling = undefined;    
            this.showInformationMessage("Unit test auto-run disabled");
        } else {
            this._autoRunPolling = vscode.workspace.onDidChangeTextDocument(e => {
                if((e.document.languageId !== "php") || (e.contentChanges.length === 0)) {
                    return;
                }
                this._onPHPDocumentChanged.emit('DOC-CHG', e);
            });
            this.showInformationMessage("Unit test auto-run enabled");
        }
    }

    /**
     * Keep track of the last test function we ran so we can re-edit it
     */
    get lastTestFunctionInfo() : PHPTestFunctionInfo | undefined {
        return this._lastFunctionInfo;
    }

    set lastTestFunctionInfo(value: PHPTestFunctionInfo | undefined) {
        this._lastFunctionInfo = value;
    }

    /**
     * Return a lazy-loaded output channel for trace display
     */
    get outputChannel(): vscode.OutputChannel {
        if(! this._output) {
            this._output = vscode.window.createOutputChannel("PHP TDD");
        }
        return this._output;
    }

    /**
     * Return our diagnostic collection used to show unit test errors
     */
    get diagnostics() : vscode.DiagnosticCollection {
        if(! this._diagnostics) {
            this._diagnostics = vscode.languages.createDiagnosticCollection("PHP-TDD");
        }
        return this._diagnostics;
    }

    /**
     * Add a diagnostic item for the specified document, use "code" to track which function it's for so 
     * we can clean it up later
     * @param document 
     * @param code 
     * @param range 
     * @param message 
     * @param severity 
     */
    addDiagnostic(document: vscode.TextDocument, code: string, range: vscode.Range, message: string, severity?: vscode.DiagnosticSeverity): vscode.Diagnostic {
        const d = new vscode.Diagnostic(range, message, severity);
        if(code) {
            d.code = code;
        }
        this._diagnosticList.push(d);
        this.diagnostics.set(document.uri, this._diagnosticList);
        return d;
    }

    /**
     * Clear any diagnostics for the specified document and code item
     * @param document 
     * @param code 
     */
    clearDiagnostics(document: vscode.TextDocument, code: string) {
        const diagnostics = this.diagnostics.get(document.uri);
        if(diagnostics) {
            let modified = false;
            for(let d of diagnostics) {
                if(d.code === code) {
                    const i = this._diagnosticList.indexOf(d);
                    if(i !== -1) {
                        this._diagnosticList.splice(i, 1);
                        modified = true;
                    }
                }
            }
            if(modified) {
                this.diagnostics.set(document.uri, this._diagnosticList);
            }
        }
    }

    /**
     * Clear all diagnostics
     */
    clearAllDiagnostics() {
        this._diagnosticList = [];
        this.diagnostics.clear();
        this._statusBar.hide();
    }

    /**
     * Show a status bar message and keep track of it so we can clear it
     * @param message 
     */
    showStatusBarMessage(message: string, tooltip: string | undefined = undefined, command: string | undefined = undefined) {
        this._statusBar.text = message;
        this._statusBar.tooltip = tooltip;
        this._statusBar.command = command;
        this._statusBar.show();
    }

    /**
     * Hide most the most resent status bar message
     */
    hideStatusBarMessage() {
        this._statusBar.hide();
    }

    showInformationMessage(message: string) {
        vscode.window.showInformationMessage(message);
    }

    showWarningMessage(message: string) {
        vscode.window.showWarningMessage(message);
    }

    showErrorMessage(message: string) {
        vscode.window.showErrorMessage(message);
    }
}