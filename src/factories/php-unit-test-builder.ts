"use strict";

import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { PHPUnitTestBuilderService } from "../services/php-unit-test-builder-service";
import PHPFileParserFactory from './php-file-parser';
import ComposerSetupFactory from './composer-setup';

export default (ui: IVisualCodeShim) => {
    return new PHPUnitTestBuilderService(
        ui,
        PHPFileParserFactory(ui),
        ComposerSetupFactory(ui)
    );
};
