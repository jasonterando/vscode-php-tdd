'use strict';

import { IVisualCodeDocumentShim } from '../../../models/interfaces/vs-code-document-shim';
import { IVisualCodePositionShim } from '../../../models/interfaces/vs-code-position-shim';
import { VisualCodePositionShim } from '../../../models/vs-code-position-shim';

export class VisualCodeDocumentShimMock implements IVisualCodeDocumentShim {

    static readonly EOL = '\n';
    static readonly PADDING = '    ';

    get uri(): any {
        return {};
    }

    get eol(): string {
        return VisualCodeDocumentShimMock.EOL;
    }

    get isUntitled(): boolean {
        return false;
    }

    getFullPath(): string {
        return '';
    }

    getPaddingAt(lineNumber: number): string {
        return VisualCodeDocumentShimMock.PADDING;
    }

    getLineTextAt(lineNumber: number): string {
        return '';
    }

    getLineFirstNonWhitespaceCharacterIndex(lineNumber: number): number {
        return VisualCodeDocumentShimMock.PADDING.length;
    }

    getAllText(): string {
        return '';
    }

    getSelectionStart() : IVisualCodePositionShim {
        return new VisualCodePositionShim(1, 1);
    }

    setSelection(start: IVisualCodePositionShim, end: IVisualCodePositionShim): void {

    }

    async insertText(lineNumber: number, column: number, text: string): Promise<void> {
        return new Promise<void>((resolve) => {
            resolve();
        });
    }
}