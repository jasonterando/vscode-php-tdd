'use strict';

import * as assert from 'assert';
import { PHPUseInfo } from '../../../models/php-use-info';

suite("PHPUseInfo", () => {
    test('should construct, not be testable and expose properties', () => {
        const info = new PHPUseInfo("something", undefined, 2, 2);
        assert.equal(info.name, "something");
        assert.equal(info.namespace, undefined);
        assert.equal(info.identifier, "something");
        assert.equal(info.startLineNumber, 2);
        assert.equal(info.endLineNumber, 2);
        assert.equal(info.testable, false);
    });

    test('should default end line number to NaN', () => {
        const info = new PHPUseInfo("something", undefined, 2);
        assert.equal(isNaN(info.endLineNumber), true);
    });
    
});
