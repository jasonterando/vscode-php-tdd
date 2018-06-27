'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { PHPUtility } from '../services/php-utility';
import { SpawnServiceFactoryType } from '../factories/spawn';

/**
 * This class exposes functionality to work with Composer files,
 * mostly to add dependencies and define namespace path
 */
export class ComposerSetupService {   

    private _ui: IVisualCodeShim;
    private _spawnFactory: SpawnServiceFactoryType;
    private _enableInstall: boolean;
    private _enableNamespace: boolean;
    private _cmdComposerRequire: string;
    private _dirComposer: string;
    private _cmdComposerUpdate: string;
    private _cmdComposerDumpAutoload: string;
    private _testSubdirectory: string;

    constructor(ui: IVisualCodeShim, spawnFactory: SpawnServiceFactoryType) {
        this._ui = ui;
        this._spawnFactory = spawnFactory;
        this._enableInstall = ui.configuration.composer.enableInstall;
        this._enableNamespace = ui.configuration.composer.enableNamespace;
        this._dirComposer = ui.configuration.composer.commands.directory;
        this._cmdComposerRequire = ui.configuration.composer.commands.require;
        this._cmdComposerUpdate = ui.configuration.composer.commands.update;
        this._cmdComposerDumpAutoload = ui.configuration.composer.commands.dumpAutoload;
        this._testSubdirectory = ui.configuration.commands.directory;
    }

    /**
     * Load and parse a >JSON file
     * @param composerJsonFilePath 
     */
    async loadComposerJson(composerJsonFilePath: string) : Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if(fs.existsSync(composerJsonFilePath)) {
                fs.readFile(composerJsonFilePath, (err, contents) => {
                    if(err) {
                        reject(err);
                    } else {
                        try {
                            resolve(JSON.parse(contents.toString()));
                        } catch(e) {
                            reject(e);
                        }
                    }
                });
            } else {
                resolve({});
            }
        });
    }

    async saveComposerJson(composerJsonFilePath: string, contents: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(composerJsonFilePath, JSON.stringify(contents, null, 4), (err) => {
                if(err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Ensure the specified packages are included in the workspace's composer.json; if not,
     * add them and run composer update
     * @param workspaceFolderPath 
     * @param requiredPackages 
     * @param developmentPackages 
     */
    async checkRequirements(workspaceFolderPath: string, requiredPackages: Array<string>, developmentPackages: Array<string>) {

        function stripPackageVersion(pkg: string) {
            const i = pkg.lastIndexOf(':');
            if(i === -1) {
                return pkg;
            } else {
                return pkg.substr(0, i);
            }
        }

        if(! this._enableInstall) {
            return;
        }

        const substitutionPayload = {
            "__WORKSPACE_DIRECTORY__": workspaceFolderPath,
            "__TEST_SUBDIRECTORY__": path.normalize(this._testSubdirectory).replace(/\\/g, '\/'),
            "__PACKAGE__": '',
            "__FLAGS__": ''
        };

        let existingPackages: Array<string> = [];

        const composer = await this.loadComposerJson(path.join(workspaceFolderPath, 'composer.json'));
        if(composer.require) {
            existingPackages = Object.getOwnPropertyNames(composer.require);
        }
        if(composer['require-dev']) {
            existingPackages = existingPackages.concat(Object.getOwnPropertyNames(composer['require-dev']));
        }

        let composerPackages: Array<ComposerPackageInfo> = [];

        for(let pkg of requiredPackages) {
            const p = stripPackageVersion(pkg);
            if(existingPackages.indexOf(p) === -1) {
                composerPackages.push(new ComposerPackageInfo(pkg, false));
            }
        }

        for(let pkg of developmentPackages) {
            const p = stripPackageVersion(pkg);
            if(existingPackages.indexOf(p) === -1) {
                composerPackages.push(new ComposerPackageInfo(pkg, true));
            }
        }

        /* istanbul ignore else */
        if(composerPackages.length > 0) {
            let added = 0;
            for(let pkg of composerPackages) {
                this._ui.appendToOutputChannel("*** Adding Composer package " + pkg.package + ", please wait... ***");
                substitutionPayload.__PACKAGE__ = pkg.package;
                substitutionPayload.__FLAGS__ = pkg.development ? "--dev" : "";

                const cmd = PHPUtility.substituteValues(this._cmdComposerRequire, substitutionPayload);
                this._ui.appendToOutputChannel("Command \"" + cmd + "\"");

                await this._spawnFactory(this._ui)
                    .setCommandWithArguments(cmd)
                    .setStartInDirectory(PHPUtility.substituteValues(this._dirComposer, substitutionPayload))
                    .run();
                added++;
            }

            /* istanbul ignore else */
            if(added > 0) {
                this._ui.appendToOutputChannel("*** Running Composer update ***");
                try {
                    substitutionPayload.__PACKAGE__ = "";
                    substitutionPayload.__FLAGS__ = "";

                    const cmd = PHPUtility.substituteValues(this._cmdComposerUpdate, substitutionPayload);
                    this._ui.appendToOutputChannel("Command \"" + cmd + "\"");

                    await this._spawnFactory(this._ui)
                        .setCommandWithArguments(cmd)
                        .setStartInDirectory(PHPUtility.substituteValues(this._dirComposer, substitutionPayload))
                        .run();
                } finally {
                    this._ui.hideStatusBarMessage();
                }
            }
        }
    }

    /**
     * Ensure the entity's namespace is in the workspace's composer.json; if not,
     * add it and run composer dump-autoload
     * @param namespace 
     * @param namespaceFolderPath 
     * @param workspaceFolderPath 
     */
    async assignNamespace(namespace: string | undefined, namespaceFolderPath: string, workspaceFolderPath: string) {
        if(! this._enableNamespace) {
            return;
        }

        let modified = false;
        const composerJsonFilePath = path.join(workspaceFolderPath, 'composer.json');
        /* istanbul ignore else */
        if(namespace === undefined) {
            namespace = '';
        }

        // Set namespace path to be relative and force *nix-type slashes 
        namespaceFolderPath = path
            .relative(workspaceFolderPath, namespaceFolderPath)
            .replace(/\\/g, '\/');

        const contents = await this.loadComposerJson(composerJsonFilePath);
        /* istanbul ignore else */
        if(! contents.hasOwnProperty("autoload")) {
            contents.autoload = {};
        }

        /* istanbul ignore else */
        if(! contents.autoload.hasOwnProperty("psr-4")) {
            contents.autoload['psr-4'] = {};
        }

        /* istanbul ignore else */
        if((namespace[namespace.length - 1]) !== '\\') {
            namespace += '\\';
        }

        /* istanbul ignore else */
        if(! contents.autoload['psr-4'].hasOwnProperty(namespace)) {
            contents.autoload['psr-4'][namespace]  = null;
        }

        const n = contents.autoload['psr-4'][namespace];
        if(Array.isArray(n)) {
            var add = true;
            for(var i in n) {
                var dir = n[i];
                /* istanbul ignore else */
                if(dir === namespaceFolderPath) {
                    add = false;
                    break;
                }
            }
            /* istanbul ignore else */
            if(add) {
                contents.autoload['psr-4'][namespace].push(namespaceFolderPath);
                modified = true;
            }
        } else {
            if(n) {
                /* istanbul ignore else */
                if(n !== namespaceFolderPath) {
                    contents.autoload['psr-4'][namespace] = [n, namespaceFolderPath];
                    modified = true;
                }
            } else {
                contents.autoload['psr-4'][namespace] = namespaceFolderPath;
                modified = true;
            }
        }

        /* istanbul ignore else */
        if(modified) {
            await this.saveComposerJson(composerJsonFilePath, contents);
            const substitutionPayload = {
                "__WORKSPACE_DIRECTORY__": workspaceFolderPath,
                "__TEST_SUBDIRECTORY__": path.normalize(this._testSubdirectory).replace(/\\/g, '\/'),
                "__PACKAGE__": undefined
            };
            this._ui.appendToOutputChannel("*** Running composer dump-autoload ***");

            const cmd = PHPUtility.substituteValues(this._cmdComposerDumpAutoload, substitutionPayload);
            this._ui.appendToOutputChannel("Command \"" + cmd + "\"");

            await this._spawnFactory(this._ui)
                .setCommandWithArguments(cmd)
                .setStartInDirectory(PHPUtility.substituteValues(this._dirComposer, substitutionPayload))
                .run();
        }
    }
}

class ComposerPackageInfo {
    public package: string;
    public development: boolean;

    public constructor(pkg: string, development: boolean) {
        this.package = pkg;
        this.development = development;
    }
}