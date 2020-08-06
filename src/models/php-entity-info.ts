'use strict';

import { PHPCommentInfo } from './php-comment-info';

/**
 * Abstract class to store information about a parsed PHP entity
 */
export abstract class PHPEntityInfo {
    public depth: number = NaN;
    public comment?: PHPCommentInfo = undefined;

    constructor(public readonly name: string, public readonly namespace: string | undefined, public readonly testable: boolean, 
        public readonly startLineNumber: number, public endLineNumber: number) {}

    public abstract get identifier(): string;
     
    public get fullName() : string {
        return this.namespace ? (this.namespace + '\\' + this.name) : this.name;
    }
}