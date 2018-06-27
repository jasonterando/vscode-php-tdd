'use strict';

import * as fs from 'fs';
import * as path from 'path';

/**
 * Utilities that are not stateful
 */
export namespace PHPUtility {

    export function capitalizeFirstLetter(text: string): string {
        if(text.length === 0) {
            return "";
        } else {
            return text[0].toUpperCase() + text.substring(1);
        }
    }

    export function substituteValues(text: string, values: any): string {
        Object.keys(values).forEach(field => {
            let value = values[field];
            if(! value) {
                value = '';
            }
            text = text.replace(new RegExp(field, 'g'), value.toString());
        });
        return text;
    }

    /**
     * 
     * @param targetDir 
     */
    /* istanbul ignore next */
    export function mkdirDeep(targetDir: string) {
        const sep = path.sep;
        const initDir = path.isAbsolute(targetDir) ? sep : '';
        const baseDir = '.';
    
        targetDir.split(sep).reduce((parentDir, childDir) => {
            const curDir: string = path.resolve(baseDir, parentDir, childDir);
            try {
                if(! fs.existsSync(curDir)) {
                    fs.mkdirSync(curDir);
                }
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw new Error("Unable to create ${curDir}: ${err}");
                }
            }
            return curDir;
        }, initDir);
    }    

    /**
     * Deep delete the specified directory
     * @param dir 
     */
    /* istanbul ignore next */
    export async function rimraf(dir: string) {
        
        // All of these can get replaced by util.promisify when vscode goes to Node 8
        const exists = (path: string) => { return new Promise<boolean>((a, b) => { fs.exists(path, (d)  => { a(d); }); } ); };
        const readdir = (dir: string) => { return new Promise<string[]>((a, b) => { fs.readdir(dir, (e, d) => { e ? b(e) : a(d); }); } ); };
        const lstat = (path: string) => { return new Promise<fs.Stats>((a, b) => { fs.lstat(path, (e, d) => { e ? b(e) : a(d); }); } ); };
        const unlink = (path: string) => { return new Promise<void>((a, b) => { fs.unlink(path, (e) => { e ? b(e) : a(); }); } ); };
        const rmdir = (dir: string) => { return new Promise<void>((a, b) => { fs.rmdir(dir, (e) => { e ? b(e) : a(); }); } ); };

        if (await exists(dir)) {
            const files = await readdir(dir);
            await Promise.all(files.map(async (file) => {
                const p = path.join(dir, file);
                const stat = await lstat(p);
                if (stat.isDirectory()) {
                    await rimraf(p);
                } else {
                    await unlink(p);
                }
            }));
            await rmdir(dir);
        }
    }
}