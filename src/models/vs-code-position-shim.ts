'use strict';

import { IVisualCodePositionShim } from './interfaces/vs-code-position-shim';

export class VisualCodePositionShim implements IVisualCodePositionShim {
    constructor(public readonly line: number, public readonly character: number) {}
}