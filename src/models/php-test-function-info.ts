'use strict';

import { PHPEntityInfo } from './php-entity-info';

/**
 * This class contains test function information extracted
 * from a class or function comment
 */
export class PHPTestFunctionInfo {

    public readonly hasTestFunction: boolean;

    constructor(public readonly entity: PHPEntityInfo, public readonly disableAutoRun: boolean, public readonly functionName: string = '\0') {
        this.hasTestFunction = (functionName !== '\0') && (functionName.length > 0);
    }
}
