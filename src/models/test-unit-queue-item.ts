import { IVisualCodeDocumentShim } from "./interfaces/vs-code-document-shim";
import { PHPTestFunctionInfo } from "./php-test-function-info";
import { PHPUnitTestProjectInfo } from "./php-unit-test-project-info";

export class TestUnitQueueItem {
    constructor(public readonly document: IVisualCodeDocumentShim,
        public readonly functionInfo: PHPTestFunctionInfo,
        public readonly projectInfo: PHPUnitTestProjectInfo) {}
}