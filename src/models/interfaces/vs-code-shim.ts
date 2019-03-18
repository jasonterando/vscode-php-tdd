'use strict';

import { EventEmitter } from "events";
import { PHPTestFunctionInfo } from '../php-test-function-info';
import { IConfiguration } from './configuration';
import { IVisualCodeDocumentShim } from './vs-code-document-shim';

/**
 * This interface defines functionality that the extension uses to interace with the Visual Code UI.
 * Since the Node vscode module isn't mockable/testable, this interface cannot include any 
 * vscode types, they need to be defined/used in an implementing class
 */
export interface IVisualCodeShim {
    readonly configuration: IConfiguration;
    readonly onPHPDocumentChanged: EventEmitter;
    autoRunPolling: boolean;
    lastTestFunctionInfo: PHPTestFunctionInfo | undefined;
    readonly onWindows: boolean;

    getWorkspaceFolderPaths(): Array<string>;
    openDocument(path: string): Promise<IVisualCodeDocumentShim>;

    appendToOutputChannel(text: string): void;
    showOutputChannel(): void;

    addDiagnostic(documentURI: IVisualCodeDocumentShim, identifer: string, startLineNumber: number, startColumn: number,
        endLineNumber: number, endColumn: number, message: string, severity?: number): void;
    clearDiagnostics(document: IVisualCodeDocumentShim, code: string): void;
    clearAllDiagnostics(): void;
    
    showStatusBarMessage(message: string, tooltip?: string | undefined, command?: string | undefined): void;
    hideStatusBarMessage(): void;
    showInformationMessage(message: string): void;
    showWarningMessage(message: string): void;
    showErrorMessage(message: string): void;

    showPickList(options: Array<IVisualCodeQuickPickItem>, allowMany?: boolean): Promise<IVisualCodeQuickPickItem | undefined>;

    getEnablePHPExtensions(): boolean;
    setEnablePHPExtensions(value: boolean): Promise<void>;
}

export interface IVisualCodeQuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    picked?: boolean;
}
