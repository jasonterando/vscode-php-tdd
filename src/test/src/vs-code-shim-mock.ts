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

    openDocument(path: string): Promise<IVisualCodeDocumentShim> {
        return new Promise((resolve) => {
            return new VisualCodeDocumentShimMock();
        });
    }

    appendToOutputChannel(text: string): void {
    }

    showOutputChannel(): void {
    }
    addDiagnostic(document: IVisualCodeDocumentShim, identifer: string, startLineNumber: number, startColumn: number,
        endLineNumber: number, endColumn: number, message: string, severity?: number): void {
    }

    clearDiagnostics(document: IVisualCodeDocumentShim, code: string): void {
    }

    clearAllDiagnostics(): void {
    }

    showStatusBarMessage(message: string, tooltip?: string | undefined, command?: string | undefined): void {
    }

    hideStatusBarMessage(): void {
    }

    showInformationMessage(message: string): void {
    }
    
    showWarningMessage(message: string): void {
    }

    showErrorMessage(message: string): void {
    }

    async showPickList(options: Array<IVisualCodeQuickPickItem>, allowMany: boolean = false): Promise<IVisualCodeQuickPickItem | undefined> {
        return new Promise<IVisualCodeQuickPickItem | undefined>((resolve) => {
            if(options && options.length > 0) {
                resolve(options[0]);
            } else {
                resolve(undefined);
            }
        });
    }

}