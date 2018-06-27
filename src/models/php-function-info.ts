'use strict';

import { PHPEntityInfo } from './php-entity-info';
import { PHPClassInfo } from './php-class-info';

/**
 * Store information about a parsed PHP function entity
 */
export class PHPFunctionInfo extends PHPEntityInfo {
    class: PHPClassInfo | undefined = undefined;

    constructor(name: string, namespace: string | undefined, startLineNumber: number, endLineNumber: number = NaN) {
        super(name, namespace, true, startLineNumber, endLineNumber);
    }

    public get identifier(): string {
        return this.class ? (this.class.name + '::' + this.name) : this.name;
    }

    public get fullName() : string {
        if(this.class) {
            return this.class.fullName + '::' + this.name;
        } else {
            return super.fullName;
        }
    }
}