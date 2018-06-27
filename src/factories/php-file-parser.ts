"use strict";

import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { PHPFileParserService } from '../services/php-file-parser-service';
import SpawnServiceFactory from './spawn';

export default (ui: IVisualCodeShim) => {
    return new PHPFileParserService(SpawnServiceFactory, ui);
};