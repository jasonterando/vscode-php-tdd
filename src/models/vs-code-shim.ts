'use strict';

import * as vscode from 'vscode';
import * as os from 'os';
import { EventEmitter } from 'events';
import { IVisualCodeShim, IVisualCodeQuickPickItem } from './interfaces/vs-code-shim';
import { IVisualCodeDocumentShim } from './interfaces/vs-code-document-shim';
import { PHPTestFunctionInfo } from './php-test-function-info';
import { VisualCodeDocumentShim } from './vs-code-document-shim';
import { Configuration } from './configuration';

/**
 * This class handles stateful functionality for VSCode workspaces
 */
export class VisualCodeShim extends vscode.Disposable implements IVisualCodeShim {
    public readonly onWindows = os.platform() === "win32";
    // Active configuration
    public readonly configuration: Configuration = new Configuration();
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

    constructor()  {
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
            if(e.affectsConfiguration('php-tdd')) {
                const oldEnableAutoRun = this.configuration.enableAutoRun;
                this.updateConfiguration();
                if(oldEnableAutoRun !== this.configuration.enableAutoRun) {
                    this.autoRunPolling = this.configuration.enableAutoRun;
                }
            }
        });

        this.updateConfiguration();
        this.autoRunPolling = this.configuration.enableAutoRun;
    }

    /**
     * Update stored configuration (triggered on init and config change)
     */
    protected updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration("php-tdd");
        this.configuration.testSubdirectory = config['testSubdirectory'];
        this.configuration.testClassTemplateFile = config['testClassTemplateFile'];
        this.configuration.enableAutoRun = config['enableAutoRun'];
        this.configuration.commands.directory = config['commands']['directory'];
        this.configuration.commands.runUnitTest = config['commands']['runUnitTest'];
        this.configuration.commands.runAllUnitTests = config['commands']['runAllUnitTests'];
        this.configuration.commands.runCodeCoverage = config['commands']['runCodeCoverage'];
        this.configuration.commands.codeCoverageReport = config['commands']['codeCoverageReport'];
        this.configuration.composer.enableInstall = config['composer']['enableInstall'];
        this.configuration.composer.enableNamespace = config['composer']['enableNamespace'];
        this.configuration.composer.packagesRequired = config['composer']['packagesRequired'];
        this.configuration.composer.packagesDevelopment = config['composer']['packagesDevelopment'];
        this.configuration.composer.commands.directory = config['composer']['commands']['directory'];
        this.configuration.composer.commands.require = config['composer']['commands']['require'];
        this.configuration.composer.commands.update = config['composer']['commands']['update'];
        this.configuration.composer.commands.dumpAutoload = config['composer']['commands']['dumpAutoload'];
        this.configuration.enablePHPExtensions = config['enablePHPExtensions'];
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
     * Return a list of all workspace folder paths
     */
    getWorkspaceFolderPaths(): Array<string> {
        const folders = vscode.workspace.workspaceFolders;
        if(folders) {
            return folders.map((f) => {
                return f.uri.fsPath;
            });
        } else {
            return [];
        }
    }
    /**
     * Open up a document
     * @param path 
     */
    async openDocument(path: string): Promise<IVisualCodeDocumentShim> {
        const document = await vscode.workspace.openTextDocument(path);
        const editor = await vscode.window.showTextDocument(document);
        return new VisualCodeDocumentShim(document, editor);
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
     * Append a line to the output channel
     */
    appendToOutputChannel(text: string) {
        if(! this._output) {
            this._output = vscode.window.createOutputChannel("PHP TDD");
        }
        this._output.appendLine(text);
    }

    /**
     * Display the output channel
     */
    showOutputChannel() {
        if(this._output) {
            this._output.show();
        }
    }

    /**
     * Get the current value for forcing PHP to enable JSON and tokenizer modules
     */
    getEnablePHPExtensions(): boolean {
        return this.configuration.enablePHPExtensions;
    }

    /**
     * Update the current value for forcing PHP to enable JSON and tokenizer modules
     */
    async setEnablePHPExtensions(value: boolean) {
        const config = vscode.workspace.getConfiguration("php-tdd");
        await config.update('enablePHPExtensions', value);
    }

    /**
     * Add a diagnostic item for the active document, use identifier to track which function it's for so 
     * we can clean it up later
     * @param document
     * @param identifer
     * @param startLineNumber
     * @param startColumn
     * @param endLineNumber
     * @param endColumn
     * @param message 
     * @param severity (0=error, 1=warning, 2=info)
     */
    addDiagnostic(document: IVisualCodeDocumentShim, identifer: string, startLineNumber: number, startColumn: number,
        endLineNumber: number, endColumn: number, message: string, severity: number = 1) {
        if(! this._diagnostics) {
            this._diagnostics = vscode.languages.createDiagnosticCollection("PHP-TDD");
        }
        const range = new vscode.Range(
            new vscode.Position(startLineNumber, startColumn),
            new vscode.Position(endLineNumber, endColumn)
        );
        const d = new vscode.Diagnostic(range, message, severity);
        if(identifer) {
            d.code = identifer;
        }
        this._diagnosticList.push(d);
        this._diagnostics.set(document.uri, this._diagnosticList);
    }

    /**
     * Clear any diagnostics for the active document and code item
     * @param code 
     */
    clearDiagnostics(document: IVisualCodeDocumentShim, code: string) {
        if(this._diagnostics) {
            const diagnostics = this._diagnostics.get(document.uri);
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
                    this._diagnostics.set(document.uri, this._diagnosticList);
                }
            }
        }
    }

    /**
     * Clear all diagnostics
     */
    clearAllDiagnostics() {
        this._diagnosticList = [];
        if(this._diagnostics) {
            this._diagnostics.clear();
        }
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

    /**
     * Show information message
     * @param message 
     */
    showInformationMessage(message: string) {
        vscode.window.showInformationMessage(message);
    }

    /**
     * Show warning message
     * @param message 
     */
    showWarningMessage(message: string) {
        vscode.window.showWarningMessage(message);
    }

    /**
     * Show error message
     * @param message 
     */
    showErrorMessage(message: string) {
        vscode.window.showErrorMessage(message);
    }

    /**
     * Show a pick list asynchronously, return a promise with result
     * @param options 
     * @param allowMany 
     */
    async showPickList(options: Array<IVisualCodeQuickPickItem>, allowMany: boolean = false): Promise<IVisualCodeQuickPickItem | undefined> {
        return await vscode.window.showQuickPick<vscode.QuickPickItem>(options, { canPickMany: allowMany });
    }
}