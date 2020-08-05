'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import { PHPDocumentEditorService } from '../../../services/php-document-editor-service';
import { PHPFunctionInfo } from '../../../models/php-function-info';
import { VisualCodeDocumentShimMock } from '../unit/vs-code-document-shim-mock';
import { PHPCommentInfo, PHPCommentType } from '../../../models/php-comment-info';

suite("PHPDocumentEditorService", () => {
    suite("addCommentBlock", () => {
        test("create comment block with specified text", async () => {
            const entity = new PHPFunctionInfo("TestMethod", undefined, 10, 20);
            const editor = new PHPDocumentEditorService();
            const document = new VisualCodeDocumentShimMock();

            const spyInsertText = sinon.spy(document, "insertText");
            await editor.addCommentBlock(entity, document, "Some text");
            assert(spyInsertText.calledWith(9, 0, VisualCodeDocumentShimMock.PADDING + 
                "/**" + VisualCodeDocumentShimMock.EOL + 
                VisualCodeDocumentShimMock.PADDING + " * Some text" + 
                VisualCodeDocumentShimMock.EOL + VisualCodeDocumentShimMock.PADDING + " */" + 
                VisualCodeDocumentShimMock.EOL));
        });
    });

    suite("appendInlineComment", () => {
        test("append text to inline comment", async () => {
            const comment = new PHPCommentInfo(PHPCommentType.Inline, 8, 9);
            const editor = new PHPDocumentEditorService();
            const document = new VisualCodeDocumentShimMock();

            const spyInsertText = sinon.spy(document, "insertText");
            await editor.appendComment(comment, document, "Some text");
            assert(spyInsertText.calledWith(9, 0, VisualCodeDocumentShimMock.PADDING + 
                "// Some text" + VisualCodeDocumentShimMock.EOL));
        });
        
        test("append text to comment block", async () => {
            const comment = new PHPCommentInfo(PHPCommentType.Block, 8, 9);
            const editor = new PHPDocumentEditorService();
            const document = new VisualCodeDocumentShimMock();

            const spyInsertText = sinon.spy(document, "insertText");
            await editor.appendComment(comment, document, "Some text");
            assert(spyInsertText.calledWith(8, 0, VisualCodeDocumentShimMock.PADDING + 
                "* Some text" + VisualCodeDocumentShimMock.EOL));
        });
    });

    suite("addTestFunction", () => {
        test("append to existing inline comment", async () => {
            const entity = new PHPFunctionInfo("TestMethod", undefined, 10, 20);
            entity.comment = new PHPCommentInfo(PHPCommentType.Inline, 8, 9);
            const editor = new PHPDocumentEditorService();
            const document = new VisualCodeDocumentShimMock();

            const spyInsertText = sinon.spy(document, "insertText");
            await editor.addTestFunction('foo', entity, document);
            const text = VisualCodeDocumentShimMock.PADDING +
                "// @testFunction foo" + VisualCodeDocumentShimMock.EOL;
            assert(spyInsertText.calledWith(9, 0, text));
        });
        test("create new block comment", async () => {
            const entity = new PHPFunctionInfo("TestMethod", undefined, 10, 20);
            const editor = new PHPDocumentEditorService();
            const document = new VisualCodeDocumentShimMock();

            const spyInsertText = sinon.spy(document, "insertText");
            await editor.addTestFunction('foo', entity, document);
            const text = VisualCodeDocumentShimMock.PADDING +
                "/**" + VisualCodeDocumentShimMock.EOL + 
                VisualCodeDocumentShimMock.PADDING +" * @testFunction foo" + VisualCodeDocumentShimMock.EOL + 
                VisualCodeDocumentShimMock.PADDING + " */" + VisualCodeDocumentShimMock.EOL;
            assert(spyInsertText.calledWith(9, 0, text));
        });
    });

});