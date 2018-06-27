'use strict';

import { PHPEntityInfo } from './php-entity-info';

export class PHPUseInfo extends PHPEntityInfo {
    constructor(name: string, namespace: string | undefined, startLineNumber: number, endLineNumber: number = NaN) {
        super(name, namespace, false, startLineNumber, endLineNumber);
    }

    public get identifier(): string {
        return this.name;
    }
}