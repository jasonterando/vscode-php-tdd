'use strict';

import { IVisualCodePositionShim } from "./vs-code-position-shim";

/**
 * This interface defines functionality that the extension uses to interace with a Visual Code document.
 * Since the Node vscode module isn't mockable/testable, this interface cannot include any 
 * vscode types, they need to be defined/used in an implementing class
 */
export interface IVisualCodeDocumentShim {
    readonly eol: string;
    readonly isUntitled: boolean;
    readonly uri: any;
    getFullPath(): string;
    getPaddingAt(lineNumber: number): string;
    getLineTextAt(lineNumber: number): string;
    getLineFirstNonWhitespaceCharacterIndex(lineNumber: number): number;
    getAllText(): string;
    getSelectionStart() : IVisualCodePositionShim;
    setSelection(start: IVisualCodePositionShim, end: IVisualCodePositionShim): void;
    insertText(lineNumber: number, column: number, text: string): Promise<void>;
}