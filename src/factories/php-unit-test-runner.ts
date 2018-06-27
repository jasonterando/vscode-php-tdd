"use strict";

import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { PHPUnitTestRunnerService } from "../services/php-unit-test-runner-service";
import PHPFileParserFactory from './php-file-parser';
import SpawnServiceFactory from './spawn';

export default (ui: IVisualCodeShim) => {
    return new PHPUnitTestRunnerService(ui, 
        PHPFileParserFactory(ui),
        SpawnServiceFactory(ui)
    );
};
