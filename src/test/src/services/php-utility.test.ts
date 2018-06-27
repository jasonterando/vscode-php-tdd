'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import { PHPUtility } from '../../../services/php-utility';

let sandbox: sinon.SinonSandbox;

suite('PHPUtility', () => {
    setup(() => {
        sandbox = sinon.createSandbox();
    });
    teardown(() => {
        sandbox.restore();
    });

    suite('capitalizeFirstLetter', () => {
        test('should return empty on empty string', () => {
            assert.equal(PHPUtility.capitalizeFirstLetter(''), '');
        });
        test('should return capitalized first letter', () => {
            assert.equal(PHPUtility.capitalizeFirstLetter('cat'), 'Cat');
        });
    });

    suite('substituteValues', () => {
        test('should return empty on empty string', () => {
            assert.equal(PHPUtility.substituteValues('', {}), '');
        });
        test('should replace all instances', () => {
            assert.equal(PHPUtility.substituteValues('__dog__ __dog__ __cat__ __cat__ __cow__ __cow__', 
                {"__dog__": "fido", "__cat__": "mittens", "__cow__": undefined}), 'fido fido mittens mittens  ');
        });
    });
    
});
