'use strict';

/**
 * This class holds PHP TDD configuration
 */
export class Configuration {
    public testSubdirectory = '';
    public testClassTemplateFile = '';
    public enableAutoRun = false;
    public commands = {
        directory: '',
        runUnitTest: '',
        runAllUnitTests: '',
        runCodeCoverage: '',
        codeCoverageReport: ''
    };
    public composer = {
        enableInstall: false,
        enableNamespace: false,
        packagesRequired: [],
        packagesDevelopment: [],
        commands: {
            directory: '',
            require: '',
            update: '',
            dumpAutoload: ''
        }
    };
    public enablePHPExtensions = false;
}