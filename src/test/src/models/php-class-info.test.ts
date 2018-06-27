'use strict';

import * as assert from 'assert';
import { PHPClassInfo } from '../../../models/php-class-info';
import { PHPFunctionInfo } from '../../../models/php-function-info';

suite('PHPClassInfo', () => {
    suite('testable', () => {
        test('should return true', () => {
            const info = new PHPClassInfo('MyClass', 'MyNamespace', 10, 20);
            assert.equal(info.testable, true);
        });
    });
    suite('identifier', () => {
        test('should return name', () => {
            const info = new PHPClassInfo('MyClass', 'MyNamespace', 10, 20);
            assert.equal(info.identifier, 'MyClass');
        });      
    });
    suite('functions', () => {
        test('should allow setting and getting functions', () => {
            const info = new PHPClassInfo('MyClass', 'MyNamespace', 10, 20);
            const f = new PHPFunctionInfo('Function1', 'MyNamespace', 14, 15);
            info.functions.push(f);
            assert.deepEqual(info.functions, [f]);
        });
    });
});
