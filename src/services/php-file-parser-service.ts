'use strict';

import * as path from 'path';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import { PHPEntityInfo } from '../models/php-entity-info';
import { PHPClassInfo } from '../models/php-class-info';
import { PHPFunctionInfo } from '../models/php-function-info';
import { PHPUseInfo } from '../models/php-use-info';
import { PHPCommentType, PHPCommentInfo } from '../models/php-comment-info';
import { SpawnServiceFactoryType } from '../factories/spawn';

export class PHPFileParserService {

    private _spawnServiceFactory: SpawnServiceFactoryType;
    private _ui: IVisualCodeShim;

    constructor (spawnServiceFactory: SpawnServiceFactoryType, ui: IVisualCodeShim) {
        this._spawnServiceFactory = spawnServiceFactory;
        this._ui = ui;
    }

    /**
     * Return the testbale entity, if any, 
     * at the specified line number (class, class function or standalone function)
     * @param phpCode 
     * @param evalAtLineNumber 
     * @returns PHPEntityInfo | undefined
     */
    async getEntityAtLineNumber(phpCode: string, evalAtLineNumber: number): Promise<PHPEntityInfo | undefined> {
        const parsedTokens = await this.tokenize(phpCode);
        const result = this.parse(parsedTokens, evalAtLineNumber);
        if(result instanceof PHPEntityInfo) {
            return result;
        } else {
            return undefined;
        }
    }

    /**
     * Get all entities
     */
    async getEntities(phpCode: string): Promise<Array<PHPEntityInfo>> {
        const parsedTokens = await this.tokenize(phpCode);
        const result = this.parse(parsedTokens);
        if(Array.isArray(result)) {
            return result;
        } else {
            throw new Error("Unable to retrieve PHP entities");
        }
    }

    /**
     * Get all entities that are testable
     */
    async getTestableEntities(phpCode: string): Promise<Array<PHPEntityInfo>> {
        const parsedTokens = await this.tokenize(phpCode);
        const result = <any[]> this.parse(parsedTokens);
        return result.filter(function(x) {
            return x.testable;
        });
    }

    /**
     * Pipe out to PHP to get a dump of tokens in a set of PHP code
     * @param phpCode
     */
    async tokenize(phpCode: string): Promise<Array<any>> {
        const forceJSON = this._ui.getEnablePHPExtensions();
        try {
            const args = ['-n'];
            if(forceJSON) {
                const ext = this._ui.onWindows ? "dll" : "so";
                //args.push('-d', `extension=json.${ext}`);
                args.push('-d', `extension=tokenizer.${ext}`);
            }
            args.push(`"${path.join(path.dirname(__dirname), 'dump.php')}"`);
            const results = await this._spawnServiceFactory(this._ui, false)
                .setCommand('php')
                .setArguments(args)
                .setWriteToStdin(phpCode)
                .run();
            return JSON.parse(results);
        } catch(e) {
            if((e.message.indexOf('undefined function json_encode') !== -1) && (! forceJSON)) {
                await this._ui.setEnablePHPExtensions(true);
                return await this.tokenize(phpCode);
            } else {
                throw e;
            }
        }
    }

    /**
     * Get the next non-empty thing on a line (used to get namespaces, class and function names)
     * @param ctr 
     * @param lineNo 
     * @param tokens
     */
    static getNextDescriptorOnLine(ctr: number, lineNo: number, tokens: Array<any>): string {
        const limit = tokens.length;
        let result = "";
        let skipInitialWhiteSpace = true;
        while ((ctr++) + 1 < limit) {
            var token = tokens[ctr];
            if (!Array.isArray(token)) {
                break;
            }
            if (token[2] !== lineNo) {
                break;
            }
            const str = token[1].trim();
            if (str.length > 0) {
                skipInitialWhiteSpace = false;
                result += str;
            } else if (skipInitialWhiteSpace) {
                continue;
            } else {
                break;
            }
        }
        return result;
    }

    /**
     * Return true if a line has a token representing the start of a class or function
     * @param ctr 
     * @param lineNo 
     * @param tokens
     */
    static isLineClassOrFunction(ctr: number, lineNo: number, tokens: Array<any>): boolean {
        const limit = tokens.length;
        while (ctr < limit) {
            var token = tokens[ctr];
            if (!Array.isArray(token)) {
                return false;
            }
            if (token[2] !== lineNo) {
                return false;
            }
            const str = token[1].trim();
            if(str.length > 0) {
                if (str === "class" || str === "function") {
                    return true;
                } else {
                    return false;
                }
            }
            ctr++;
        }
        return false;
    }


    /**
     * Parse the PHP code passed.  If evalAtLineNumber is specified, the function returns the PHP entity,
     * if any, that is on that line (defined as either a class, a class method or standalone function).
     * If evalAtLineNumber is not specified, the entire list of entities will be returned
     * @param parsedTokens 
     * @param evalAtLineNumber 
     */
    parse(parsedTokens: Array<any>, evalAtLineNumber: number = NaN): PHPEntityInfo | Array<PHPEntityInfo> | undefined {
        let activeTokens: Array<any>;
        if(parsedTokens.length < 1) {
            throw new Error("No PHP tokens found to parse");
        }

        // Main processing
        activeTokens = parsedTokens;
        let ctr = 0;
        // let ignoreInDoubleQuotes = false;
        // let ignoreInSingleQuotes = false;

        let entities: Array<PHPEntityInfo> = [];
        let matchingFunction: PHPFunctionInfo | undefined = undefined;
        let currentNamespace: string | undefined = undefined;
        let currentClass = null;
        let currentFunction = null;
        let currentComment: PHPCommentInfo | undefined = undefined;

        let depth = 0;
        let lineNumber: number = NaN;

        const limit = activeTokens.length;
        while (ctr < limit) {
            const token = activeTokens[ctr];
            if(token[0] === 323) {
                depth = depth;
            }

            if (Array.isArray(token)) {
                lineNumber = token[2];

                const content = token[1];
                // if (! (ignoreInDoubleQuotes || ignoreInSingleQuotes)) {
                    switch (content) {
                        case "namespace":
                        case "phpnamespace":
                            const namespaceName = PHPFileParserService.getNextDescriptorOnLine(ctr, lineNumber, activeTokens);
                            currentNamespace = namespaceName;
                            break;
                        case "use":
                            const namespace = PHPFileParserService.getNextDescriptorOnLine(ctr, lineNumber, activeTokens);
                            entities.push(new PHPUseInfo('', namespace, lineNumber, lineNumber));
                            break;
                        case "class":
                            const className = PHPFileParserService.getNextDescriptorOnLine(ctr, lineNumber, activeTokens);
                            // console.info("Class " + className + " - START detected at element " + ctr.toString() + ", line " + lineNumber.toString());
                            currentClass = new PHPClassInfo(className, currentNamespace, lineNumber);
                            if (currentComment) {
                                // console.info("Class " + className + " - comment applied, " + currentComment.startLineNumber.toString() + " to " + currentComment.endLineNumber.toString());
                                currentClass.comment = currentComment;
                                currentComment = undefined;
                            }
                            entities.push(currentClass);
                            break;
                        case "function":
                            const functionName = PHPFileParserService.getNextDescriptorOnLine(ctr, token[2], activeTokens);
                            if (functionName.length > 0 && (!currentFunction)) {
                                // console.info("Function " + functionName + " - START detected at element " + ctr.toString() + ", line " + lineNumber.toString());
                                currentFunction = new PHPFunctionInfo(functionName, currentNamespace, lineNumber);
                                if (currentComment) {
                                    // console.info("Function " + functionName + " - comment applied, " + currentComment.startLineNumber.toString() + " to " + currentComment.endLineNumber.toString());
                                    currentFunction.comment = currentComment;
                                    currentComment = undefined;
                                }
                                if (currentClass && (depth === currentClass.depth)) {
                                    currentClass.functions.push(currentFunction);
                                } else {
                                    entities.push(currentFunction);
                                }
                            }
                            break;
                        default:
                            // if(currentComment && content.replace(/[\n\r]/g, '').length === 0) {
                            //     currentComment = undefined;
                            // }
                            const lineMatches = content.match(/\n/g);
                            const lines = lineMatches ? lineMatches.length : 0;
                            if (content.match(/\/\*(\*(?!\/)|[^*])*\*\//)) {
                                // console.info("Comment (block) detected at element " + ctr.toString() + ", line " + lineNumber.toString() + " to " + (lineNumber + lines).toString());
                                currentComment = new PHPCommentInfo(PHPCommentType.Block, lineNumber,
                                    lineNumber + lines);
                            } else if (content.match(/\/\/.*/g)) {
                                if (currentComment && currentComment.type === PHPCommentType.Inline) {
                                    // console.info("Comment (block) continuation detected at element " + ctr.toString() + ", " + (lineNumber).toString());
                                    currentComment.endLineNumber = lineNumber;
                                } else {
                                    // console.info("Comment (inline) detected at element " + ctr.toString() + ", line " + lineNumber.toString());
                                    currentComment = new PHPCommentInfo(PHPCommentType.Inline, lineNumber, lineNumber);
                                }
                            } else if ((content.trim().length > 0) && 
                                (currentComment && (! PHPFileParserService.isLineClassOrFunction(ctr + 1, lineNumber, activeTokens)))) {
                                if (lineNumber > currentComment.endLineNumber) {
                                    // console.info("Comment cleared " + currentComment.startLineNumber.toString() + " to " + currentComment.endLineNumber.toString());
                                    currentComment = undefined;
                                }
                            }
                            lineNumber += lines;
                            break;
                    }
                // }
            } else {
                // if (ignoreInDoubleQuotes) {
                //     if(token === '\"') {
                //         ignoreInDoubleQuotes = false;
                //     }
                // } else if (ignoreInSingleQuotes) {
                //     if(token === '\'') {
                //         ignoreInSingleQuotes = false;
                //     }
                // } else {
                    switch (token) {
                        // case '\"':
                        //     ignoreInDoubleQuotes = true;
                        //     break;
                        // case '\'':
                        //     ignoreInSingleQuotes = true;
                        //     break;
                        case '{':
                            depth++;
                            if (currentClass && (!currentClass.depth)) {
                                currentClass.depth = depth;
                            }
                            if (currentFunction && (!currentFunction.depth)) {
                                currentFunction.depth = depth;
                            }
                            break;
                        case '}':
                            if (currentFunction && (currentFunction.depth === depth)) {
                                currentFunction.endLineNumber = lineNumber;
                                var from = currentFunction.comment ? currentFunction.comment.startLineNumber : currentFunction.startLineNumber;
                                if ((! isNaN(evalAtLineNumber)) && (evalAtLineNumber >= from &&
                                    evalAtLineNumber <= currentFunction.endLineNumber)) {
                                    matchingFunction = currentFunction;
                                }
                                currentFunction = null;
                            } else if (currentClass && (currentClass.depth === depth)) {
                                currentClass.endLineNumber = lineNumber;
                                var from1 = currentClass.comment ? currentClass.comment.startLineNumber : currentClass.startLineNumber;
                                if ((! isNaN(evalAtLineNumber)) && (evalAtLineNumber >= from1 &&
                                    evalAtLineNumber <= currentClass.endLineNumber)) {
                                    if(matchingFunction) {
                                        matchingFunction.class = currentClass;
                                        // console.info("Returning matching function from curlyBrace end");
                                        return matchingFunction;
                                    } else {
                                        // console.info("Returning currentClass from curlyBrace end");
                                        return currentClass;
                                    }
                                }
                                currentClass = null;
                            // } else if (matchingFunction !== undefined) {
                            //     console.info("Returning matchingFunction from curlyBrace end with no class");
                            //     resolve(matchingFunction);
                            //     return;
                            }
                            depth--;
                            break;
                    }
                // }
            }
            ctr++;
        }
        // console.info("Returning matchingFunction from end of function");
        return isNaN(evalAtLineNumber) ? entities : matchingFunction;
    }
}
