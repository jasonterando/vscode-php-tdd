'use strict';

import * as assert from 'assert';
import { PHPClassInfo } from '../../../models/php-class-info';
import { PHPFunctionInfo } from '../../../models/php-function-info';

suite('PHPFunctionInfo', () => {
    suite('testable', () => {
        test('should return true', () => {
            const info = new PHPFunctionInfo('Function1', 'MyNamespace', 12, 14);
            assert.equal(info.testable, true);
        });
    });
    suite('identifier', () => {
        test('should return clsas and function name when class is defined', () => {
            const info = new PHPFunctionInfo('Function1', 'MyNamespace', 12, 14);
            const c = new PHPClassInfo('MyClass', 'MyNamespace', 1, 20);
            info.class = c;
            assert.equal(info.identifier, 'MyClass::Function1');
        });
        test('should return function name when namespace is undefined', () => {
            const info = new PHPFunctionInfo('Function1', undefined, 12, 14);
            assert.equal(info.identifier, 'Function1');
        });
    });
    suite('class', () => {
        test('should set and get class', () => {
            const info = new PHPFunctionInfo('Function1', undefined, 12, 14);
            const c = new PHPClassInfo('MyClass', 'MyNamespace', 1, 20);
            info.class = c;
            assert.equal(info.class, c);
        });
    });        
    suite('fullName', () => {
        test('should return full class and function name when class is defined', () => {
            const info = new PHPFunctionInfo('Function1', 'MyNamespace', 12, 14);
            info.class = new PHPClassInfo('MyClass', 'MyNamespace', 1, 20);
            assert.equal(info.fullName, 'MyNamespace\\MyClass::Function1');
        });
        test('should return namespace and function name when namespace is defined', () => {
            const info = new PHPFunctionInfo('Function1', 'MyNamespace', 12, 14);
            assert.equal(info.fullName, 'MyNamespace\\Function1');
        });
        test('should return function name when namespace is undefined', () => {
            const info = new PHPFunctionInfo('Function1', undefined, 12, 14);
            assert.equal(info.fullName, 'Function1');
        });
    });
});
