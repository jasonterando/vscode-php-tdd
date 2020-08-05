'use strict';

import { IVisualCodeShim, IVisualCodeQuickPickItem } from '../../models/interfaces/vs-code-shim';
import { EventEmitter } from "events";
import { PHPTestFunctionInfo } from '../../models/php-test-function-info';
import { IVisualCodeDocumentShim } from '../../models/interfaces/vs-code-document-shim';
import { VisualCodeDocumentShimMock } from './unit/vs-code-document-shim-mock';
import { Configuration } from '../../models/configuration';

/**
 * Mock class to use to allow unit tests to simulate interacting
 * with Visual Code
 */
export class VisualCodeShimMock implements IVisualCodeShim {
    public static readonly EOL = '\n';
    public static readonly PADDING = '    ';
    public readonly onWindows = false;
    public readonly configuration = new Configuration();
    private _eventEmitter = new EventEmitter();
    private _autoRunPolling = false;
    private _lastTestFunctionInfo: PHPTestFunctionInfo | undefined = undefined;
    
    get onPHPDocumentChanged(): EventEmitter {
        return this._eventEmitter;
    }

    get autoRunPolling() {
        return this._autoRunPolling;
    }

    set autoRunPolling(value: boolean) {
        this._autoRunPolling = value;
    }

    get lastTestFunctionInfo(): PHPTestFunctionInfo | undefined {
        return this._lastTestFunctionInfo;
    }

    set lastTestFunctionInfo(value: PHPTestFunctionInfo | undefined) {
        this._lastTestFunctionInfo = value;
    }

    getWorkspaceFolderPaths(): Array<string> {
        return [];
    }

    openDocument(_path: string): Promise<IVisualCodeDocumentShim> {
        return new Promise((resolve) => {
            resolve(new VisualCodeDocumentShimMock());
        });
    }

    appendToOutputChannel(_text: string): void {
    }

    showOutputChannel(): void {
    }
    addDiagnostic(_document: IVisualCodeDocumentShim, _identifer: string, _startLineNumber: number, _startColumn: number,
        _endLineNumber: number, _endColumn: number, _message: string, _severity?: number): void {
    }

    clearDiagnostics(_document: IVisualCodeDocumentShim, _code: string): void {
    }

    clearAllDiagnostics(): void {
    }

    showStatusBarMessage(_message: string, _tooltip?: string | undefined, _command?: string | undefined): void {
    }

    hideStatusBarMessage(): void {
    }

    showInformationMessage(_message: string): void {
    }
    
    showWarningMessage(_message: string): void {
    }

    showErrorMessage(_message: string): void {
    }

    async showPickList(options: Array<IVisualCodeQuickPickItem>, _allowMany: boolean = false): Promise<IVisualCodeQuickPickItem | undefined> {
        return new Promise<IVisualCodeQuickPickItem | undefined>((resolve) => {
            if(options && options.length > 0) {
                resolve(options[0]);
            } else {
                resolve(undefined);
            }
        });
    }

    getEnablePHPExtensions(): boolean {
        return false;
    }

    setEnablePHPExtensions(_value: boolean): Promise<void> {
        return Promise.resolve();
    }
}