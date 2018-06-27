'use strict';

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { ComposerSetupService } from '../../../services/composer-setup-service';
import { SpawnService } from '../../../services/spawn-service';
import { IVisualCodeShim } from '../../../models/interfaces/vs-code-shim';
import VisualCodeShimFactory from '../vs-code-shim-factory';

let sandbox: sinon.SinonSandbox;

suite('ComposerSetupService', () => {
    setup(() => {
        sandbox = sinon.createSandbox();
    });
    teardown(() => {
        sandbox.restore();
    });

    suite('loadComposerJson', () => {
        test('should return an object when loading composer.json file succesfully', async () => {
            const ui = VisualCodeShimFactory();
            const test = '{ "foo": { "bar": 1 } }';
            sandbox.stub(fs, 'existsSync')
                .returns(true)
                .calledWith('composer.json');
            sandbox.stub(fs, 'readFile')
                .yields(undefined, JSON.stringify(test))
                .calledWith('composer.json');
            const svc = new ComposerSetupService(ui, () => { return new SpawnService(ui); });
            const result = await svc.loadComposerJson('composer.json');
            assert.deepEqual(result, test);
        });
        test('should throw an exception when composer.json file is not read succesfully', (done) => {
            const ui = VisualCodeShimFactory();
            const err = new Error('Bad File');
            sandbox.stub(fs, 'existsSync')
                .returns(true)
                .calledWith('composer.json');
            sandbox.stub(fs, 'readFile')
                .yields(err)
                .calledWith('composer.json');
            const svc = new ComposerSetupService(ui, () => { return new SpawnService(ui); });
            svc.loadComposerJson('composer.json').then(() => {
                sinon.assert.fail('Should have failed with Bad File');
                done();
            }).catch(e => {
                assert.equal(e.message, 'Bad File');
                done();
            });
        });
        test('should throw an exception when composer.json file is invalid', (done) => {
            const ui = VisualCodeShimFactory();
            sandbox.stub(fs, 'existsSync')
                .returns(true)
                .calledWith('composer.json');
            sandbox.stub(fs, 'readFile')
                .yields(undefined, '{')
                .calledWith('composer.json');
            const svc = new ComposerSetupService(ui, () => { return new SpawnService(ui); });
            svc.loadComposerJson('composer.json').then(() => {
                sinon.assert.fail('Should have failed with Unexpected end of JSON input');
                done();
            }).catch(e => {
                assert.equal(e.message, 'Unexpected end of JSON input');
                done();
            });
        });
        test('should return an empty object if composer.json file does not exist', async () => {
            const ui = VisualCodeShimFactory();
            sandbox.stub(fs, 'existsSync')
                .returns(false)
                .calledWith('composer.json');
            const svc = new ComposerSetupService(ui, () => { return new SpawnService(ui); });
            assert.deepEqual(await svc.loadComposerJson('composer.json'), {});
        });
    });

    suite('saveComposerJson', () => {
        test('should save an object succesfully', async () => {
            const ui = VisualCodeShimFactory();
            const test = { "foo": { "bar": 1 } };
            sandbox.stub(fs, 'writeFile')
                .yields()
                .calledWith('composer.json', JSON.stringify(test, undefined, 4));
            const svc = new ComposerSetupService(ui, () => { return new SpawnService(ui); });
            await svc.saveComposerJson('composer.json', test);
        });
        test('should throw an exception if file is not saved succesfully', (done) => {
            const ui = VisualCodeShimFactory();
            const test = { "foo": { "bar": 1 } };
            const err = new Error('Bad file');
            sandbox.stub(fs, 'writeFile')
                .yields(err)
                .calledWith('composer.json', JSON.stringify(test, undefined, 4));
            const svc = new ComposerSetupService(ui, () => { return new SpawnService(ui); });
            svc.saveComposerJson('composer.json', test).then(() => {
                sinon.assert.fail('Should have failed with Bad file');
                done();
            }).catch(e => {
                assert.equal(e.message, 'Bad file');
                done();
            });
        });
    });

    suite('checkRequirements', () => {
        test('should exit if enableInstall is false', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableInstall = false;

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                sinon.assert.fail('Spawn factory should not be called (all packages are already in composer.json)');
                return new SpawnService(ui, mirrorOutput);
            };

            const svc = new ComposerSetupService(ui, spawnFactory);
            sinon.assert.notCalled(sinon.spy(svc, 'loadComposerJson'));
            await svc.checkRequirements('', [], []);
        });
        test('should add new reqiured and development packages', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableInstall = true;
            ui.configuration.composer.commands.require = 'composer require __FLAGS__ __PACKAGE__';
            ui.configuration.composer.commands.update = 'composer update';
            const test = { };

            const workspaceFolderPath = '/foo';
            const requiredPackages = ['composer'];
            const developmentPackages = ['phpunit'];

            // This is a little funky, but seems to work...
            let spawnCtr = 0;
            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                const spawn = new SpawnService(ui, mirrorOutput);
                // Validate what we are running
                sinon.stub(spawn, "run").callsFake(() => {
                    const cmd = spawn.command;
                    const args = spawn.arguments;
                    switch(spawnCtr++) {
                        case 0:
                            sinon.assert.match(cmd, 'composer');
                            sinon.assert.match(args, ['require', 'composer']);
                            break;
                        case 1:
                            sinon.assert.match(cmd, 'composer');
                            sinon.assert.match(args, ['require', '--dev', 'phpunit']);
                            break;
                        case 2:
                            sinon.assert.match(cmd, 'composer');
                            sinon.assert.match(args, ['update']);
                            break;
                    }
                });
                return spawn;
            };

            const svc = new ComposerSetupService(ui, spawnFactory);

            sinon.stub(svc, 'loadComposerJson')
                .resolves(test)
                .calledWith('/foo/composer.json');

            await svc.checkRequirements(workspaceFolderPath, requiredPackages, developmentPackages);
        });
        test('should not add existing reqiured and development packages', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableInstall = true;
            ui.configuration.composer.commands.require = 'composer require __FLAGS__ __PACKAGE__';
            ui.configuration.composer.commands.update = 'composer update';
            const test = { 'require': { 'composer': '1.0' }, 'require-dev': { 'phpunit': '1.0' } };

            const workspaceFolderPath = '/foo';
            const requiredPackages = ['composer'];
            const developmentPackages = ['phpunit:^8.0'];

            // This is a little funky, but seems to work...
            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                sinon.assert.fail('Spawn factory should not be called (all packages are already in composer.json)');
                return new SpawnService(ui, mirrorOutput);
            };

            const svc = new ComposerSetupService(ui, spawnFactory);

            sinon.stub(svc, 'loadComposerJson')
                .resolves(test)
                .calledWith('/foo/composer.json');

            await svc.checkRequirements(workspaceFolderPath, requiredPackages, developmentPackages);
        });
        test('should choke if loadComposerFile fails', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableInstall = true;

            const workspaceFolderPath = '/foo';

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                sinon.assert.fail('Spawn factory should not be called (all packages are already in composer.json)');
                return new SpawnService(ui, mirrorOutput);
            };

            const svc = new ComposerSetupService(ui, spawnFactory);
            const err = new Error('Nope!');
            sinon.stub(svc, 'loadComposerJson')
                .throws(err)
                .calledWith('/foo/composer.json');
            svc.checkRequirements(workspaceFolderPath, ['foo'], []).then(() => {
                sinon.assert.fail('Should have failed with Nope!');
            }).catch(e => {
                assert.equal(e.message, 'Nope!');
            });
        });
    });
    suite('assignNamespace', () => {
        test('should exit if enableNamespace is false', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableNamespace = false;

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                sinon.assert.fail('Spawn factory should not be called (all packages are already in composer.json)');
                return new SpawnService(ui, mirrorOutput);
            };

            const svc = new ComposerSetupService(ui, spawnFactory);
            sinon.assert.notCalled(sinon.spy(svc, 'loadComposerJson'));
            await svc.assignNamespace('test', '/var/foo/test', '/var/foo');
        });
        test('should add namespace and create psr-4 section in composer.json', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableNamespace = true;
            ui.configuration.composer.commands.dumpAutoload = 'composer dump-autoload';

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                const spawn = new SpawnService(ui, mirrorOutput);
                spawn.run = () => {
                    return new Promise((r) => {
                        const cmd = spawn.command;
                        const args = spawn.arguments;
                        sinon.assert.match(cmd, 'composer');
                        sinon.assert.match(args, ['dump-autoload']);
                        r();
                    });
                };
                return spawn;
            };

            const namespace = 'test';
            const namespaceFolderPath = '/var/foo/src/test';
            const workspaceFolderPath = '/var/foo';
            const updatedJson = { "autoload": { "psr-4": { "test\\": "src/test"  } } };

            const svc = new ComposerSetupService(ui, spawnFactory);
            
            const loadSpy = sinon.stub(svc, 'loadComposerJson');
            loadSpy.resolves({});
            const saveSpy = sinon.stub(svc, 'saveComposerJson');
            
            await svc.assignNamespace(namespace, namespaceFolderPath, workspaceFolderPath);

            const normalizedComposerJson = path.normalize('/var/foo/composer.json');
            sinon.assert.calledWith(loadSpy,  normalizedComposerJson);
            sinon.assert.calledWith(saveSpy, normalizedComposerJson, updatedJson);
            sinon.assert.calledOnce(saveSpy);

        });
        test('should default namespace to global and create psr-4 section in composer.json', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableNamespace = true;
            ui.configuration.composer.commands.dumpAutoload = 'composer dump-autoload';

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                const spawn = new SpawnService(ui, mirrorOutput);
                spawn.run = () => {
                    return new Promise((r) => {
                        const cmd = spawn.command;
                        const args = spawn.arguments;
                        sinon.assert.match(cmd, 'composer');
                        sinon.assert.match(args, ['dump-autoload']);
                        r();
                    });
                };
                return spawn;
            };

            const namespace = undefined;
            const namespaceFolderPath = '/var/foo/src/test';
            const workspaceFolderPath = '/var/foo';
            const updatedJson = { "autoload": { "psr-4": { "\\": "src/test"  } } };

            const svc = new ComposerSetupService(ui, spawnFactory);
            
            const loadSpy = sinon.stub(svc, 'loadComposerJson');
            loadSpy.resolves({});
            const saveSpy = sinon.stub(svc, 'saveComposerJson');
            
            await svc.assignNamespace(namespace, namespaceFolderPath, workspaceFolderPath);

            const normalizedComposerJson = path.normalize('/var/foo/composer.json');
            sinon.assert.calledWith(loadSpy,  normalizedComposerJson);
            sinon.assert.calledWith(saveSpy, normalizedComposerJson, updatedJson);
            sinon.assert.calledOnce(saveSpy);

        });
        test('should append to existing namespace in psr-4 section in composer.json', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableNamespace = true;
            ui.configuration.composer.commands.dumpAutoload = 'composer dump-autoload';

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                const spawn = new SpawnService(ui, mirrorOutput);
                spawn.run = () => {
                    return new Promise((r) => {
                        const cmd = spawn.command;
                        const args = spawn.arguments;
                        sinon.assert.match(cmd, 'composer');
                        sinon.assert.match(args, ['dump-autoload']);
                        r();
                    });
                };
                return spawn;
            };

            const namespace = undefined;
            const namespaceFolderPath = '/var/foo/src/test';
            const workspaceFolderPath = '/var/foo';
            const updatedJson = { "autoload": { "psr-4": { "\\": ["src/test1", "src/test"] } } };

            const svc = new ComposerSetupService(ui, spawnFactory);
            
            const loadSpy = sinon.stub(svc, 'loadComposerJson');
            loadSpy.resolves({ "autoload": { "psr-4": { "\\": "src/test1" } } });

            const saveSpy = sinon.stub(svc, 'saveComposerJson');
            
            await svc.assignNamespace(namespace, namespaceFolderPath, workspaceFolderPath);

            const normalizedComposerJson = path.normalize('/var/foo/composer.json');
            sinon.assert.calledWith(loadSpy,  normalizedComposerJson);
            sinon.assert.calledWith(saveSpy, normalizedComposerJson, updatedJson);
            sinon.assert.calledOnce(saveSpy);
        });
        test('should append to existing namespace array in psr-4 section in composer.json', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableNamespace = true;
            ui.configuration.composer.commands.dumpAutoload = 'composer dump-autoload';

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                const spawn = new SpawnService(ui, mirrorOutput);
                spawn.run = () => {
                    return new Promise((r) => {
                        const cmd = spawn.command;
                        const args = spawn.arguments;
                        sinon.assert.match(cmd, 'composer');
                        sinon.assert.match(args, ['dump-autoload']);
                        r();
                    });
                };
                return spawn;
            };

            const namespace = undefined;
            const namespaceFolderPath = '/var/foo/src/test';
            const workspaceFolderPath = '/var/foo';
            const updatedJson = { "autoload": { "psr-4": { "\\": ["src/test1", "src/test"] } } };

            const svc = new ComposerSetupService(ui, spawnFactory);
            
            const loadSpy = sinon.stub(svc, 'loadComposerJson');
            loadSpy.resolves({ "autoload": { "psr-4": { "\\": [ "src/test1" ] } } });

            const saveSpy = sinon.stub(svc, 'saveComposerJson');
            
            await svc.assignNamespace(namespace, namespaceFolderPath, workspaceFolderPath);

            const normalizedComposerJson = path.normalize('/var/foo/composer.json');
            sinon.assert.calledWith(loadSpy,  normalizedComposerJson);
            sinon.assert.calledWith(saveSpy, normalizedComposerJson, updatedJson);
            sinon.assert.calledOnce(saveSpy);
        });
        test('should skip existing entry namespace array in psr-4 section in composer.json', async () => {
            const ui = VisualCodeShimFactory();
            ui.configuration.composer.enableNamespace = true;
            ui.configuration.composer.commands.dumpAutoload = 'composer dump-autoload';

            const spawnFactory = (ui: IVisualCodeShim, mirrorOutput?: boolean) => {
                const spawn = new SpawnService(ui, mirrorOutput);
                spawn.run = () => {
                    return new Promise((r) => {
                        const cmd = spawn.command;
                        const args = spawn.arguments;
                        sinon.assert.match(cmd, 'composer');
                        sinon.assert.match(args, ['dump-autoload']);
                        r();
                    });
                };
                return spawn;
            };

            const namespace = undefined;
            const namespaceFolderPath = '/var/foo/src/test';
            const workspaceFolderPath = '/var/foo';

            const svc = new ComposerSetupService(ui, spawnFactory);
            
            const loadSpy = sinon.stub(svc, 'loadComposerJson');
            loadSpy.resolves({ "autoload": { "psr-4": { "\\": [ "src/test" ] } } });

            const saveSpy = sinon.stub(svc, 'saveComposerJson');
            
            await svc.assignNamespace(namespace, namespaceFolderPath, workspaceFolderPath);

            const normalizedComposerJson = path.normalize('/var/foo/composer.json');
            sinon.assert.calledWith(loadSpy,  normalizedComposerJson);
            sinon.assert.notCalled(saveSpy);
        });
    });
});