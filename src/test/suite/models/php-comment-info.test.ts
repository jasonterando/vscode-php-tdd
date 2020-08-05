'use strict';

import * as assert from 'assert';
import { PHPCommentInfo, PHPCommentType } from '../../../models/php-comment-info';

suite("PHPCommentInfo", function () {
    test('should construct and get properties', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Block, 100, 200);
        assert.equal(comment.type, PHPCommentType.Block);
        assert.equal(comment.startLineNumber, 100);
        assert.equal(comment.endLineNumber, 200);
    });
    test('should construct with defaults', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Block);
        assert.equal(comment.type, PHPCommentType.Block);
        assert.equal(isNaN(comment.startLineNumber), true);
        assert.equal(isNaN(comment.endLineNumber), true);
    });
    test('should change end line number', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Block, 100, 200);
        assert.equal(comment.endLineNumber, 200);
        comment.endLineNumber = 300;
        assert.equal(comment.endLineNumber, 300);
    });
    test('should format single page range', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Block, 99, 99);
        assert.equal(comment.rangeToString(), "on 100");
    });
    test('should format multiple page range', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Block, 99, 199);
        assert.equal(comment.rangeToString(), "from 100 to 200");
    });
    test('should format invalid range', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Block, NaN, NaN);
        assert.equal(comment.rangeToString(), "");
    });
    test('should render inline', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Inline, 19, 19);
        assert.equal(comment.toString(), "Inline comment on 20");
    });
    test('should render block', () => {
        const comment = new PHPCommentInfo(PHPCommentType.Block, 29, 49);
        assert.equal(comment.toString(), "Block comment from 30 to 50");
    });
});
