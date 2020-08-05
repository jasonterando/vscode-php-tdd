'use strict';

import * as child_process from 'child_process';
import * as path from 'path';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';

/**
 * Utility class to wrap/isolate calls to child proces;
 * set up accessors to perform fluent-ly
 */
export class SpawnService {

    private _ui: IVisualCodeShim;
    private _command: string = '';
    private _arguments: Array<string> = [];
    private _startInDirectory: string | undefined = undefined;
    private _writeToStdin: string | undefined = undefined;
    private _mirrorOutput: boolean = true;

    constructor(ui: IVisualCodeShim, mirrorOutput: boolean = true) {
        this._ui = ui;
        this._mirrorOutput = mirrorOutput;
    }

    public setCommand(command: string) {
        this._command = command;
        return this;
    }

    public get command() {
        return this._command;
    }

    public setArguments(args: Array<string>) {
        this._arguments = args;
        return this;
    }

    public get arguments() {
        return this._arguments;
    }

    /**
     * Split command and arguments, taking into account double quotes
     * @param commandWithArguments 
     */
    public setCommandWithArguments(commandWithArguments: string) {
        let inQuotes = false;
        let anchor = 0;
        let parts: Array<string> = [];
        for(let i = 0; i < commandWithArguments.length; i++) {
            const c = commandWithArguments[i];
            switch(c) {
                case '\"':
                    if(inQuotes) {
                        const part = commandWithArguments.substring(anchor, i).trim();
                        if(part.length > 0) {
                            parts.push(part);
                        }
                        anchor = i + 1;
                        inQuotes = false;
                    } else {
                        anchor = i + 1;
                        inQuotes = true;
                    }
                    break;
                case ' ':
                    if(anchor !== -1 && (! inQuotes)) {
                        const part = commandWithArguments.substring(anchor, i).trim();
                        if(part.length > 0) {
                            parts.push(part);
                        }
                        anchor = i;
                    }
                    break;
            }            
        }
        /* istanbul ignore else */
        if(anchor !== -1) {
            const part = commandWithArguments.substring(anchor).trim(); 
            if(part.length > 0) {
               parts.push(part);
            }
        }

        this._command = parts[0];
        this._arguments = parts.slice(1);
        return this;
    }

    public setStartInDirectory(startInDirectory: string) {
        this._startInDirectory = startInDirectory;
        return this;
    }

    public get startInDirectory() {
        return this._startInDirectory;
    }

    public setWriteToStdin(writeToStdin: string) {
        this._writeToStdin = writeToStdin;
        return this;
    }

    public get writeToStdin() {
        return this._writeToStdin;
    }

    public run(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let output: string = '';
            let options : child_process.SpawnOptions = {
                shell: true,
                cwd: this._startInDirectory
            };
            const child = child_process.spawn(path.normalize(this._command), this._arguments, options);
            if( ! child.stdin) {
                reject(`STDIN not available for spawned command ${this._command}`);
                return;
            }
            if( ! child.stdout) {
                reject(`STDOUT not available for spawned command ${this._command}`);
                return;
            }
            if( ! child.stderr) {
                reject(`STDERR not available for spawned command ${this._command}`);
                return;
            }
            child.stdout.on('data', (data) => {
                output += data;
                if(this._mirrorOutput) {
                    this._ui.appendToOutputChannel(data.toString());
                }
            });
            child.stderr.on('data', (data) => {
                output += data;
                if(this._mirrorOutput) {
                    this._ui.appendToOutputChannel(data.toString());
                }
            });
            child.on('close', (code) => {
                (code === 0) ? resolve(output) : reject(new Error(output));
            });
            child.on('error', (err) => {
                reject((err instanceof Error) ? err : new Error(err));
            });

            if(this._writeToStdin) {            
                child.stdin.write(this._writeToStdin);
                child.stdin.end();
            }
        });
    }

    /**
     * Launches the specified file in the OS (can use to view documents)
     * @param file
     * @param fromDirectory 
     */
    launchFile(file: string) {
        let options = {
            shell: true,
            cwd: this._startInDirectory
        };
        const cmd = (process.platform === 'darwin'? 'open': process.platform === 'win32'? 'start': 'xdg-open');
        child_process.spawn(cmd, [file], options);
    }
    
}