'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as events from 'events';
import * as child_process from 'child_process';
import * as process from 'process';

import { SpawnService } from '../../../services/spawn-service';
import { VisualCodeShimMock } from '../vs-code-shim-mock';
import * as stream from 'stream';

suite("SpawnService", () => {

    const TEST_COMMAND = 'foo';
    const TEST_ARGS = ['abc', 'def'];
    const TEST_START_IN_DIRECTORY = '/var/foo';

    suite("command", function() {
        test("should set and get", () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            assert.equal(spawn, spawn.setCommand(TEST_COMMAND));
            assert.equal(spawn.command, TEST_COMMAND);
        });
    });

    suite("arguments", () => {
        test("should set and get", () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            assert.equal(spawn.setArguments(TEST_ARGS), spawn);
            assert.deepEqual(spawn.arguments, TEST_ARGS);
        });
    });

    suite("setCommandWithArguments", () => {
        test("should separate command and unquoted arguments", () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            assert.equal(spawn.setCommandWithArguments(TEST_COMMAND + ' ' + TEST_ARGS.join(' ')), spawn);
            assert.equal(spawn.command, TEST_COMMAND);
            assert.deepEqual(spawn.arguments, TEST_ARGS);
        });

        test("should separate command and quoted arguments", () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            assert.equal(spawn.setCommandWithArguments('"foo bar" abc " " def "ghi jkl" mno "'), spawn);
            assert.equal(spawn.command, 'foo bar');
            assert.deepEqual(spawn.arguments, ['abc', 'def', 'ghi jkl', 'mno']);
        });
    });  

    suite("startInDirectory", () => {
        test("should set and get", () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            assert.equal(spawn.setStartInDirectory(TEST_START_IN_DIRECTORY), spawn);
            assert.equal(spawn.startInDirectory, TEST_START_IN_DIRECTORY);
        });
    });

    suite("writeToStdin", () => {
        test("should set and get", () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            assert.equal(spawn.setWriteToStdin('123'), spawn);
            assert.equal(spawn.writeToStdin, '123');
        });
    });

    suite("run", () => {
        test("should succeed when process returns zero", async() => {
            const sandbox = sinon.createSandbox();
            try {
                const CMD = 'foo';
                const ARGS = ['--bar'];
                const START_IN = '/var/fubar';
    
                const STDIN_TEXT = 'I typed this!';
                const STDERR_TEXT = 'Some diag stuff...';
                const STDOUT_TEXT = 'Some output stuff...';
    
                const proc = <child_process.ChildProcess> new events.EventEmitter();
                proc.stdin = new stream.Writable();
                proc.stdout = <stream.Readable> new events.EventEmitter();
                proc.stderr = <stream.Readable> new events.EventEmitter();
    
                // Stub out child process, returning our fake child process
                sandbox.stub(child_process, 'spawn')
                    .returns(proc)    
                    .calledOnceWith(CMD, ARGS, { shell: true, cwd: START_IN });
    
                // Stub our expectations with any text we are inputing,
                // you can remove these two lines if not piping in data
                sandbox.stub(proc.stdin, "write").calledOnceWith(STDIN_TEXT);
                sandbox.stub(proc.stdin, "end").calledOnce = true;
    
                // Launch your process here
                // const p = spawnAsPromise(CMD, ARGS, OPTS, STDIN_TEXT);
                const ui = new VisualCodeShimMock();
                const p = (new SpawnService(ui)
                    .setCommand(CMD)
                    .setArguments(ARGS)
                    .setStartInDirectory(START_IN)
                    .setWriteToStdin(STDIN_TEXT)
                .run());
        
                // Simulate your program's output
                proc.stderr.emit('data', STDERR_TEXT);
                proc.stdout.emit('data', STDOUT_TEXT);
    
                // Exit your program, 0 = success, !0 = failure
                proc.emit('close', 0);
    
                // The close should get rid of the process
                const results = await p;
                assert.equal(results, STDERR_TEXT + STDOUT_TEXT);
            } finally {
                sandbox.restore();
            }
        });

        test("should throw exception if process returns non-zero result", async() => {
            const sandbox = sinon.createSandbox();
            try {
                const CMD = 'foo';
                const ARGS = ['--bar'];
                const START_IN = '/var/fubar';
    
                const proc = <child_process.ChildProcess> new events.EventEmitter();
                proc.stdin = new stream.Writable();
                proc.stdout = <stream.Readable> new events.EventEmitter();
                proc.stderr = <stream.Readable> new events.EventEmitter();
    
                sandbox.stub(child_process, 'spawn')
                    .returns(proc)    
                    .calledOnceWith(CMD, ARGS, { shell: true, cwd: START_IN });
    
                const ui = new VisualCodeShimMock();
                const p = (new SpawnService(ui).run());
                proc.emit('close', 1);
        
                try {
                    await p;
                    assert.equal(1, -1, "Run should have failed");
                } catch(e) {
                    assert.equal(e instanceof Error, true);
                }
            } finally {
                sandbox.restore();
            }
        });

        test("should throw exception if spawn triggers error event with non-Error payload", async() => {
            const sandbox = sinon.createSandbox();
            try {
                const CMD = 'foo';
                const ARGS = ['--bar'];
                const START_IN = '/var/fubar';

                const proc = <child_process.ChildProcess> new events.EventEmitter();
                proc.stdin = new stream.Writable();
                proc.stdout = <stream.Readable> new events.EventEmitter();
                proc.stderr = <stream.Readable> new events.EventEmitter();

                sandbox.stub(child_process, 'spawn')
                    .returns(proc)    
                    .calledOnceWith(CMD, ARGS, { shell: true, cwd: START_IN });

                const ui = new VisualCodeShimMock();
                const p = (new SpawnService(ui).run());
                proc.emit('error', 'error');
        
                try {
                    await p;
                    assert.equal(1, -1, "Run should have failed");
                } catch(e) {
                    assert.equal(e instanceof Error, true);
                }
            } finally {
                sandbox.restore();
            }
        });

        test("should throw exception if spawn triggers error event with Error payload", async() => {
            const sandbox = sinon.createSandbox();
            try {
                const CMD = 'foo';
                const ARGS = ['--bar'];
                const START_IN = '/var/fubar';
    
                const proc = <child_process.ChildProcess> new events.EventEmitter();
                proc.stdin = new stream.Writable();
                proc.stdout = <stream.Readable> new events.EventEmitter();
                proc.stderr = <stream.Readable> new events.EventEmitter();
    
                sandbox.stub(child_process, 'spawn')
                    .returns(proc)    
                    .calledOnceWith(CMD, ARGS, { shell: true, cwd: START_IN });
    
                const ui = new VisualCodeShimMock();
                const p = (new SpawnService(ui).run());
                proc.emit('error', new Error('error'));
        
                try {
                    await p;
                    assert.equal(1, -1, "Run should have failed");
                } catch(e) {
                    assert.equal(e instanceof Error, true);
                }
            } finally {
                sandbox.restore();
            }
        });
    });

    suite("launchFile", () => {
        test("should launch on MacOS", () => {
            const sandbox = sinon.createSandbox();
            const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
            try {
                Object.defineProperty(process, 'platform', {
                    'value': 'darwin'
                });
                const stubSpawn = sandbox.stub(child_process, "spawn");
                stubSpawn.withArgs('open', ['foo'], {shell: true, cwd: TEST_START_IN_DIRECTORY});
                const ui = new VisualCodeShimMock();
                (new SpawnService(ui))
                    .setStartInDirectory(TEST_START_IN_DIRECTORY)
                    .launchFile('foo');
            } finally {
                sandbox.restore();
                Object.defineProperty(process, 'platform', {
                    'value': originalPlatform
                });
            }
        });
    
        test("should launch on Windows", () => {
            const sandbox = sinon.createSandbox();
            const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
            try {
                Object.defineProperty(process, 'platform', {
                    'value': 'win32'
                });
                const stubSpawn = sandbox.stub(child_process, "spawn");
                stubSpawn.withArgs('start', ['foo'], {shell: true, cwd: TEST_START_IN_DIRECTORY});
                const ui = new VisualCodeShimMock();
                (new SpawnService(ui))
                    .setStartInDirectory(TEST_START_IN_DIRECTORY)
                    .launchFile('foo');
            } finally {
                sandbox.restore();
                Object.defineProperty(process, 'platform', {
                    'value': originalPlatform
                });
            }
        });
    
        test("should launch on Linux", () => {
            const sandbox = sinon.createSandbox();
            const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
            try {
                Object.defineProperty(process, 'platform', {
                    'value': 'linux'
                });
                const stubSpawn = sandbox.stub(child_process, "spawn");
                stubSpawn.withArgs('xdg-open', ['foo'], {shell: true, cwd: TEST_START_IN_DIRECTORY});
                const ui = new VisualCodeShimMock();
                (new SpawnService(ui))
                    .setStartInDirectory(TEST_START_IN_DIRECTORY)
                    .launchFile('foo');
            } finally {
                sandbox.restore();
                Object.defineProperty(process, 'platform', {
                    'value': originalPlatform
                });
            }
        });    
    });    
});