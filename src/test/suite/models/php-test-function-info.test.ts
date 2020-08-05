'use strict';

import * as assert from 'assert';
import { PHPClassInfo } from '../../../models/php-class-info';
import { PHPTestFunctionInfo } from '../../../models/php-test-function-info';

suite('PHPTestFunctionInfo', () => {
    suite('testable', () => {
        test('should constrct and return property', () => {
            const entity = new PHPClassInfo('MyClass', 'MyNamespace', 1, 20);
            const info = new PHPTestFunctionInfo(entity, false, 'testMyClass');
            assert.equal(info.entity, entity);
            assert.equal(info.disableAutoRun, false);
            assert.equal(info.functionName, 'testMyClass');
        });
    });
    suite('hasTestFunction', () => {
        test('should true when a testFunction is set', () => {
            const entity = new PHPClassInfo('MyClass', 'MyNamespace', 1, 20);
            const info = new PHPTestFunctionInfo(entity, false, 'testMyClass');
            assert.equal(info.hasTestFunction, true);
        });
        test('should false when a testFunction is not set', () => {
            const entity = new PHPClassInfo('MyClass', 'MyNamespace', 1, 20);
            const info = new PHPTestFunctionInfo(entity, false);
            assert.equal(info.hasTestFunction, false);
        });
    });
});
