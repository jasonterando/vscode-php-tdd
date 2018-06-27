'use strict';

import { PHPEntityInfo } from './php-entity-info';

/**
 * This class contains test function information extracted
 * from a class or function comment
 */
export class PHPTestFunctionInfo {

    public readonly entity: PHPEntityInfo;
    public readonly functionName: string;
    public readonly disableAutoRun: boolean;

    constructor(entity: PHPEntityInfo, disableAutoRun: boolean, functionName: string = '\0') {
        this.entity = entity;
        this.disableAutoRun = disableAutoRun;
        this.functionName = functionName;
    }

    get hasTestFunction(): boolean {
        return (this.functionName !== '\0') && (this.functionName.length > 0);
    }
}
