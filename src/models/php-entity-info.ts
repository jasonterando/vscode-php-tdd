'use strict';

import { PHPCommentInfo } from './php-comment-info';

/**
 * Abstract class to store information about a parsed PHP entity
 */
export abstract class PHPEntityInfo {
    readonly name: string;
    readonly namespace: string | undefined = undefined;
    readonly testable: boolean = false;
    readonly startLineNumber: number;
    endLineNumber: number = NaN;
    depth: number = NaN;
    comment?: PHPCommentInfo = undefined;

    constructor(name: string, namespace: string | undefined, testable: boolean, 
        startLineNumber: number, endLineNumber: number) {
        this.name = name;
        this.namespace = namespace;
        this.testable = testable;
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }

    public abstract get identifier(): string;
     
    public get fullName() : string {
        return this.namespace ? (this.namespace + '\\' + this.name) : this.name;
    }
}