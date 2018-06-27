'use strict';

export enum PHPCommentType {
    Inline,
    Block
}

/**
 * Class to store parsed PHP comments
 */
export class PHPCommentInfo {

    readonly type: PHPCommentType;
    readonly startLineNumber: number;
    endLineNumber: number = NaN;

    constructor(type: PHPCommentType, startLineNumber: number = NaN, endLineNumber: number = NaN) {
        this.type = type;
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }
    
    rangeToString(): string {
        let validStart = ! isNaN(this.startLineNumber);
        let validEnd = ! isNaN(this.endLineNumber);
        if(validStart && validEnd) {
            if(this.startLineNumber === this.endLineNumber) {
                return "on " + (this.startLineNumber + 1).toString();
            } else {
                return "from " + (this.startLineNumber + 1).toString() + " to " + (this.endLineNumber + 1).toString();
            }
        } else {
            return "";
        }
    }

    toString(): string {
        switch(this.type) {
            case PHPCommentType.Inline:
                return "Inline comment " + this.rangeToString();
            case PHPCommentType.Block:
                return "Block comment " + this.rangeToString();
        }
    }
}