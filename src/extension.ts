'use strict';

import * as vscode from 'vscode';
import { WorkflowFactory } from './factories/workflow';
import { VisualCodeDocumentShim } from './models/vs-code-document-shim';
import { VisualCodeShim } from './models/vs-code-shim';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    console.log('PHP-TDD is active');

    // Set up a UI shim
    const ui = new VisualCodeShim();
    const workflow = WorkflowFactory(ui);

    context.subscriptions.push(ui);

    ui.onPHPDocumentChanged.on('DOC-CHG', async (e: vscode.TextDocumentChangeEvent) => {
        if(e.contentChanges.length === 0) {
            return;
        }
        await workflow.onDocumentChanged(e);
    });

    /**
     * Initialize unit test for the active file (if open) or workspace
     */
    const cmdInitializeUnitTest = vscode.commands.registerCommand('phptdd.initializeUnitTestProject', async () => {
        try {
            await workflow.createUnitTestDirectory();
        } catch(e: any) {
            vscode.window.showWarningMessage(e.toString());
        }
    });
    context.subscriptions.push(cmdInitializeUnitTest);

    const cmdEditUnitTest = vscode.commands.registerCommand('phptdd.editUnitTest', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if(editor) {
                await workflow.editUnitTest(new VisualCodeDocumentShim(editor.document, editor));
            }
        } catch(e: any) {
            vscode.window.showWarningMessage(e.toString());
        }
    });
    context.subscriptions.push(cmdEditUnitTest);

    const cmdLastEditUnitTest = vscode.commands.registerCommand('phptdd.editLastUnitTest', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if(editor) {
                await workflow.editLastUnitTest(new VisualCodeDocumentShim(editor.document, editor));
            }
        } catch(e: any) {
            vscode.window.showWarningMessage(e.toString());
        }
    });
    context.subscriptions.push(cmdLastEditUnitTest);

    const cmdRunUnitTest = vscode.commands.registerCommand('phptdd.runUnitTest', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if(editor) {
                await workflow.runUnitTest(new VisualCodeDocumentShim(editor.document, editor));
            }
        } catch(e: any) {
            vscode.window.showWarningMessage(e.toString());
        }
    });
    context.subscriptions.push(cmdRunUnitTest);

    const cmdRunAllUnitTests = vscode.commands.registerCommand('phptdd.runAllUnitTests', async () => {
        try {
            const workflow = WorkflowFactory(ui);
            await workflow.runAllUnitTests(false);
        } catch(e: any) {
            vscode.window.showWarningMessage(e.toString());
        }
    });
    context.subscriptions.push(cmdRunAllUnitTests);
    
    const cmdRunAllWithCoverageUnitTests = vscode.commands.registerCommand('phptdd.runAllWithCoverageUnitTests', async () => {
        try {
            await workflow.runAllUnitTests(true);
        } catch(e: any) {
            vscode.window.showWarningMessage(e.toString());
        }
    });
    context.subscriptions.push(cmdRunAllWithCoverageUnitTests);
    

    const cmdClearDiagnostics = vscode.commands.registerCommand('phptdd.clearProblems', async () => {
        try {
            ui.clearAllDiagnostics();
        } catch(e: any) {
            vscode.window.showWarningMessage(e.toString());
        }
    });
    context.subscriptions.push(cmdClearDiagnostics);

}

// this method is called when your extension is deactivated
export function deactivate() {
    console.log('PHP-TDD is inactive');
}