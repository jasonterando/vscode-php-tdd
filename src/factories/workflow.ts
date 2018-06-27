'use strict';

import { Workflow} from '../workflow';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import PHPDocumentEditorServiceFactory from './php-document-editor';
import PHPUnitTestProjectFactory from './php-unit-test-project';
import PHPUnitTestRunnerFactory from './php-unit-test-runner';
import PHPUnitTestBuilderFactory from './php-unit-test-builder';
import ComposerSetupFactory from './composer-setup';

export function WorkflowFactory(ui: IVisualCodeShim ) {
    return new Workflow(ui, 
        PHPUnitTestProjectFactory(ui), 
        PHPUnitTestRunnerFactory(ui),
        PHPDocumentEditorServiceFactory(),
        PHPUnitTestBuilderFactory(ui), 
        ComposerSetupFactory(ui));
}