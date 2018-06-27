'use strict';

import { IVisualCodePositionShim } from './interfaces/vs-code-position-shim';

export class VisualCodePositionShim implements IVisualCodePositionShim {
    readonly line: number;
    readonly character: number;    

    constructor(line: number, character: number) {
        this.line = line;
        this.character = character;
    }
}