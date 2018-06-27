'use strict';

import * as vscode from 'vscode';
import { IVisualCodeDocumentShim } from './interfaces/vs-code-document-shim';
import { IVisualCodePositionShim } from './interfaces/vs-code-position-shim';
import { VisualCodePositionShim } from './vs-code-position-shim';

export class VisualCodeDocumentShim implements IVisualCodeDocumentShim {
    public readonly uri: any;
    private _document: vscode.TextDocument;
    private _editor: vscode.TextEditor | undefined;    

    constructor(document: vscode.TextDocument, editor: vscode.TextEditor | undefined = undefined) {
        this._document = document;
        this._editor = editor;
        this.uri = document.uri;
    }

    public get eol(): string {
        return (this._document.eol === vscode.EndOfLine.CRLF) ? "\r\n" : "\n";
    }

    public get isUntitled(): boolean {
        return this._document.isUntitled;
    }

    public getFullPath(): string {
        return this._document.uri.fsPath;
    }

    public getPaddingAt(lineNumber: number): string {
        const line = this._document.lineAt(lineNumber);
        const startAt = line.firstNonWhitespaceCharacterIndex;
        return line.text.substring(0, startAt);
    }

    public getLineTextAt(lineNumber: number): string {
        return this._document.lineAt(lineNumber).text;
    }

    public getLineFirstNonWhitespaceCharacterIndex(lineNumber: number): number {
        return this._document.lineAt(lineNumber).firstNonWhitespaceCharacterIndex;
    }
    
    public getAllText() : string {
        return this._document.getText();
    }

    public getSelectionStart() : IVisualCodePositionShim {
        if(this._editor) {
            return new VisualCodePositionShim(
                this._editor.selection.start.line,
                this._editor.selection.start.character
            );
        } else {
            throw new Error("An editor must be active before using this functionality");
        }
    }

    public setSelection(start: IVisualCodePositionShim, end: IVisualCodePositionShim): void {
        if(this._editor) {
            this._editor.selections = [new vscode.Selection(
                new vscode.Position(start.line, start.character),
                new vscode.Position(end.line, end.character)
            )];
        } else {
            throw new Error("An editor must be active before using this functionality");
        }
    }

    public async insertText(lineNumber: number, column: number, text: string) {
        if(this._editor) {
            await this._editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(lineNumber, column), text);
            });
        } else {
            throw new Error("An editor must be active before inserting text");
        }
    }
}