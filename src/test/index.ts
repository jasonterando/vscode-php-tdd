// 'use strict';

// Object.defineProperty(exports, "__esModule", { value: true });

// import * as path from 'path';
// import * as glob from 'glob';
// const tty = require('tty');
// // const glob = require('glob');
// const Mocha = require('mocha');

// // Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// // Since we are not running in a tty environment, we just implementt he method statically
// if (!tty.getWindowSize) {
//     tty.getWindowSize = function () { return [80, 75]; };
// }

// let mocha = new Mocha({
//     ui: 'tdd',
//     useColors: true
// });

// // var Mocha = require("mocha");
// // var mocha = new Mocha({
// //     ui: 'tdd',
// //     useColors: true
// // });
// function configure(opts: any) {
//     mocha = new Mocha(opts);
// }
// exports.configure = configure;
// function run(testsRoot: string, clb: any) {
//     // Enable source map support
//     require('source-map-support').install();
//     // Glob test files
//     glob('../**/**.test.js', { cwd: testsRoot }, (error: Error | null, files: string[]) => {
//         if (error) {
//             return clb(error);
//         }
//         try {
//             // Fill into Mocha
//             files.forEach(function (f) { return mocha.addFile(path.join(testsRoot, f)); });
//             // Run the tests
//             mocha.run(function (failures: any) {
//                 clb(null, failures);
//             });
//         }
//         catch (error) {
//             return clb(error);
//         }
//     });
// }
// exports.run = run;



//
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha based.
//
// You can provide your own test runner if you want to override it by exporting
// a function run(testRoot: string, clb: (error:Error) => void) that the extension
// host can call to run the tests. The test runner is expected to use console.log
// to report the results back to the caller. When the tests are finished, return
// a possible error to the callback or null if none.

import * as testRunner from 'vscode/lib/testrunner';

// You can directly control Mocha options by uncommenting the following lines
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options for more info
testRunner.configure({
    ui: 'tdd', 		// the TDD UI is being used in extension.test.ts (suite, test, etc.)
    useColors: true // colored output from test results
});

module.exports = testRunner;


