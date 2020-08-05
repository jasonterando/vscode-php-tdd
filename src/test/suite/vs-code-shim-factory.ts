'use strict';

export default function() {
    try {
        require('vscode');
        return new (require('../models/vs-code-shim').VisualCodeShim)();
    } catch {
        return new (require('./vs-code-shim-mock').VisualCodeShimMock)();
    }
}