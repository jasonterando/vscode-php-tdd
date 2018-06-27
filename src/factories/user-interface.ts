'use strict';

import * as vscode from 'vscode';
import { UserInterfaceService } from '../services/user-interface-service';

export default () => {
    let config = vscode.workspace.getConfiguration("php-tdd");
    if(! config) {
        throw new Error("PHP TDD not configured");
    }
    return new UserInterfaceService(config['runUnitTest']['enableAutoRun']);
};