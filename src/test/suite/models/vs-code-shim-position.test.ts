'use strict';

import * as assert from 'assert';

import { VisualCodePositionShim } from '../../../models/vs-code-position-shim';

suite('VisualCodePositionShim', () => {
    test('should construct and return properties', () => {
        const shim = new VisualCodePositionShim(10, 20);
        assert.equal(shim.line, 10);
        assert.equal(shim.character, 20);
    });
});
