'use strict';

import { PHPEntityInfo } from './php-entity-info';
import { PHPFunctionInfo } from './php-function-info';

/**
 * Store information about a parsed PHP class entity
 */
export class PHPClassInfo extends PHPEntityInfo {
    readonly functions: Array<PHPFunctionInfo> = [];

    constructor(name: string, namespace: string | undefined, startLineNumber: number, endLineNumber: number = NaN) {
        super(name, namespace, true, startLineNumber, endLineNumber);
    }

    public get identifier(): string {
        return this.name;
    }
}
