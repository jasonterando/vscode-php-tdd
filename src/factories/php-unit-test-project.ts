"use strict";

import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { PHPUnitTestProjectService } from "../services/php-unit-test-project-service";

export default (ui: IVisualCodeShim) => {
    return new PHPUnitTestProjectService(ui, "templates/source");
};
