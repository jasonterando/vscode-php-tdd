'use strict';

/**
 * This class holds PHP TDD configuration
 */
export interface IConfiguration {

    testSubdirectory: string;
    testClassTemplateFile: string;
    enableAutoRun: boolean;
    commands: {
        directory: string,
        runUnitTest: string,
        runAllUnitTests: string,
        runCodeCoverage: string,
        codeCoverageReport: string
    };
    composer: {
        enableInstall: boolean,
        enableNamespace: boolean,
        packagesRequired: Array<string>,
        packagesDevelopment: Array<string>,
        commands: {
            directory: string,
            require: string,
            update: string,
            dumpAutoload: string
        }
    };
}