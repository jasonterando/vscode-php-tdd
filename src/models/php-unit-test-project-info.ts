import * as fs from "fs";
import * as path from "path";

export class PHPUnitTestProjectInfo {
    public readonly unitTestPathExists: boolean;
    public readonly phpTDDBootstrapExists: boolean;

    constructor(public readonly unitTestPath: string, public readonly workspacePath: string) {
        this.unitTestPath = unitTestPath;
        this.unitTestPathExists = fs.existsSync(unitTestPath);
        this.workspacePath = workspacePath;
        this.phpTDDBootstrapExists =  this.unitTestPathExists
            ? fs.existsSync(path.join(unitTestPath, "phptdd-bootstrap.php"))
            : false;
    }
}