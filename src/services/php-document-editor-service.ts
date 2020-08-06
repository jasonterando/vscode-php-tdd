'use strict';

import { PHPEntityInfo } from '../models/php-entity-info';
import { PHPCommentInfo, PHPCommentType } from '../models/php-comment-info';
import { IVisualCodeDocumentShim  } from '../models/interfaces/vs-code-document-shim';

/**
 * Expose methods to modify a vscode document.  
 * 
 * Note:  Unfortunately, because vscode interfaces are not unit testable (without manually mocking everything), 
 * this class isn't really very unit testable in and of itself
 */
export class PHPDocumentEditorService {

    /**
     * Add a comment block to the given entity displayed in the given editor,
     * try and maintain indentation
     * @param entity 
     * @param document
     * @param text
     */
    async addCommentBlock(entity: PHPEntityInfo, document: IVisualCodeDocumentShim, text: string) {
        const lineNumber = entity.startLineNumber - 1;
        const eol = document.eol;
        const padding = document.getPaddingAt(lineNumber);
        await document.insertText(lineNumber, 0, 
            padding + "/**" + eol + padding + " * " + text + eol + padding + " */" + eol);
    }

    /**
     * Append a new line to the given comment
     * @param comment 
     * @param document 
     * @param text 
     */
    async appendComment(comment: PHPCommentInfo, document: IVisualCodeDocumentShim, text: string) {
        const lineNumber = comment.endLineNumber - 1;
        const eol = document.eol;
        const padding = document.getPaddingAt(lineNumber);
        switch(comment.type) {
            case PHPCommentType.Inline:
                await document.insertText(lineNumber + 1, 0, padding + "// " + text + eol);
                break;
            case PHPCommentType.Block:
                await document.insertText(lineNumber, 0, padding + "* " + text + eol);
                break;
        }
    }

    /**
     * Add a test function comment to the given entity
     * @param functionName 
     * @param entity 
     * @param document
     */
    async addTestFunction(functionName: string, entity: PHPEntityInfo, document: IVisualCodeDocumentShim) {
        const text = "@testFunction " + functionName;
        if(entity.comment) {
            await this.appendComment(entity.comment, document, text);
        } else {
            await this.addCommentBlock(entity, document, text);
        }
    }
}
