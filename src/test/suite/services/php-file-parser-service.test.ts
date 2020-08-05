'use strict';

import * as assert from 'assert';
import * as sinon from 'sinon';
import { PHPFileParserService } from '../../../services/php-file-parser-service';
import { PHPEntityInfo } from '../../../models/php-entity-info';
import { SpawnService } from '../../../services/spawn-service';
import { VisualCodeShimMock } from '../vs-code-shim-mock';
import { dirname } from 'path';
import { PHPUseInfo } from '../../../models/php-use-info';
import { PHPClassInfo } from '../../../models/php-class-info';
import { PHPFunctionInfo } from '../../../models/php-function-info';

suite("PHPFileParser", () => {

    const phpCode = "<?php\r\nnamespace MyTestNamespace;\r\n\r\nuse My_Test_Module;\r\n\r\n/**\r\n * This is a test class\r\n */\r\nclass MyCommentedClass {\r\n    // Inline parameter\r\n    private $foo = 1;\r\n\r\n    // Inline comment style\r\n    // for TestMethod 1\r\n    protected function TestMethod1() {\r\n        // Do nothing\r\n        function foo() {\r\n            return \"Bing!\";\r\n        }\r\n\r\n        return foo();\r\n    }\r\n\r\n    // Make sure we ignore quoted stuff\r\n    protected function TestMethod3() {\r\n        echo \"Double quote stuff: \r\n        function bogus1() {}\r\n        \";\r\n        echo \"Single quote stuff: \r\n        function bogus2() {}\r\n        \";\r\n    }\r\n}\r\n\r\nclass MyUncommentedClass {\r\n    function TestMethod1() {\r\n        return ;\r\n    }\r\n}\r\n\r\nfunction standaloneTest() {\r\n    return \"foo\";\r\n}\r\n\r\necho \"Begin:\" . PHP_EOL;\r\n$test = new MyTestClass();\r\necho $test->TestMethod1();";
    const fakeTokens = [[379,"<?php\n",1],[388,"namespace",2],[382," ",2],[319,"MyTestNamespace",2],";",[382,"\n\n",2],[353,"use",4],[382," ",4],[319,"My_Test_Module",4],";",[382,"\n\n",4],[378,"\/**\n * This is a test class\n *\/",6],[382,"\n",8],[361,"class",9],[382," ",9],[319,"MyCommentedClass",9],[382," ",9],"{",[382,"\n    ",9],[377,"\/\/ Inline parameter\n",10],[382,"    ",11],[314,"private",11],[382," ",11],[320,"$foo",11],[382," ",11],"=",[382," ",11],[317,"1",11],";",[382,"\n\n    ",11],[377,"\/\/ Inline comment style\n",13],[382,"    ",14],[377,"\/\/ for TestMethod 1\n",14],[382,"    ",15],[315,"protected",15],[382," ",15],[346,"function",15],[382," ",15],[319,"TestMethod1",15],"(",")",[382," ",15],"{",[382,"\n        ",15],[377,"\/\/ Do nothing\n",16],[382,"        ",17],[346,"function",17],[382," ",17],[319,"foo",17],"(",")",[382," ",17],"{",[382,"\n            ",17],[348,"return",18],[382," ",18],[323,"\"Bing!\"",18],";",[382,"\n        ",18],"}",[382,"\n\n        ",19],[348,"return",21],[382," ",21],[319,"foo",21],"(",")",";",[382,"\n    ",21],"}",[382,"\n\n    ",22],[377,"\/\/ Make sure we ignore quoted stuff\n",24],[382,"    ",25],[315,"protected",25],[382," ",25],[346,"function",25],[382," ",25],[319,"TestMethod3",25],"(",")",[382," ",25],"{",[382,"\n        ",25],[328,"echo",26],[382," ",26],[323,"\"Double quote stuff: \n        function bogus1() {}\n        \"",26],";",[382,"\n        ",28],[328,"echo",29],[382," ",29],[323,"\"Single quote stuff: \n        function bogus2() {}\n        \"",29],";",[382,"\n    ",31],"}",[382,"\n",32],"}",[382,"\n\n",33],[361,"class",35],[382," ",35],[319,"MyUncommentedClass",35],[382," ",35],"{",[382,"\n    ",35],[346,"function",36],[382," ",36],[319,"TestMethod1",36],"(",")",[382," ",36],"{",[382,"\n        ",36],[348,"return",37],[382," ",37],[317,"",37],";",[382,"\n    ",37],"}",[382,"\n",38],"}",[382,"\n\n",39],[346,"function",41],[382," ",41],[319,"standaloneTest",41],"(",")",[382," ",41],"{",[382,"\n    ",41],[348,"return",42],[382," ",42],[323,"\"foo\"",42],";",[382,"\n",42],"}",[382,"\n\n",43],[328,"echo",45],[382," ",45],[323,"\"Begin:\"",45],[382," ",45],".",[382," ",45],[319,"PHP_EOL",45],";",[382,"\n",45],[320,"$test",46],[382," ",46],"=",[382," ",46],[305,"new",46],[382," ",46],[319,"MyTestClass",46],"(",")",";",[382,"\n",46],[328,"echo",47],[382," ",47],[320,"$test",47],[366,"->",47],[319,"TestMethod1",47],"(",")",";"];

    let sandbox: sinon.SinonSandbox;
    setup(() => {
        sandbox = sinon.createSandbox();
    });
    teardown(() => {
        sandbox.restore();
    });

    suite("tokenize", () => {
        test("should return array of tokens, not setting PHP extensions if enablePHPExtensions is false", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);

            sandbox.spy(spawn.setCommand).calledWith('php');
            sandbox.spy(spawn.setArguments).calledWith(['-n', dirname('../../../dump.php')]);
            sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
            sandbox.stub(spawn, "run").resolves(JSON.stringify(fakeTokens));
            const result = await parser.tokenize(phpCode);
            assert.deepEqual(result, fakeTokens);
        });
        test("should return array of tokens, setting extensions on non-Windows as .so if enablePHPExtensions is true", async () => {
            const ui = new VisualCodeShimMock();
            (<any> ui).onWindows = false;
            sandbox.stub(ui, "getEnablePHPExtensions").returns(true);
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);

            sandbox.spy(spawn.setCommand).calledWith('php');
            sandbox.spy(spawn.setArguments).calledWith(['-n', 
                '-d', 'extension=json.so', 
                '-d', 'extension=tokenizer.so', 
                dirname('../../../dump.php')]);
            sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
            sandbox.stub(spawn, "run").resolves(JSON.stringify(fakeTokens));
            const result = await parser.tokenize(phpCode);
            assert.deepEqual(result, fakeTokens);
        });
        test("should return array of tokens, setting extensions on Windows as .dll if enablePHPExtensions is true", async () => {
            const ui = new VisualCodeShimMock();
            (<any> ui).onWindows = true;
            sandbox.stub(ui, "getEnablePHPExtensions").returns(true);
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.spy(spawn.setCommand).calledWith('php');
            sandbox.spy(spawn.setArguments).calledWith(['-n', 
                '-d', 'extension=json.dll', 
                '-d', 'extension=tokenizer.dll', 
                dirname('../../../dump.php')]);
            sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
            sandbox.stub(spawn, "run").resolves(JSON.stringify(fakeTokens));
            const result = await parser.tokenize(phpCode);
            assert.deepEqual(result, fakeTokens);
        });
        test("should set enablePHPExtensions true if PHP can't call json_encode, and return normally", async () => {
            const ui = new VisualCodeShimMock();
            const stubGetEnablePHPExtensions = sandbox.stub(ui, "getEnablePHPExtensions");
            stubGetEnablePHPExtensions.onFirstCall().returns(false);
            stubGetEnablePHPExtensions.onSecondCall().returns(true);
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);

            sandbox.spy(spawn.setCommand).calledWith('php');
            sandbox.spy(spawn.setArguments).calledWith(['-n', 
                '-d', 'extension=json.so', 
                '-d', 'extension=tokenizer.so', 
                dirname('../../../dump.php')]);
            sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
            
            const stubRun = sandbox.stub(spawn, "run");
            stubRun.onFirstCall().rejects(new Error('undefined function json_encode'));
            stubRun.onSecondCall().resolves(JSON.stringify(fakeTokens));
            const result = await parser.tokenize(phpCode);
            assert.deepEqual(result, fakeTokens);
            // Make sure setEnablePHPExtensions got called
            sandbox.spy(ui, "setEnablePHPExtensions").calledOnceWith(true);
        });
        test("should throw an Error if PHP fails with unexpected fault", async () => {
            const ui = new VisualCodeShimMock();
            sandbox.stub(ui, "getEnablePHPExtensions").returns(true);
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);

            sandbox.spy(spawn.setCommand).calledWith('php');
            sandbox.spy(spawn.setArguments).calledWith(['-n', 
                '-d', 'extension=json.so', 
                '-d', 'extension=tokenizer.so', 
                dirname('../../../dump.php')]);
            sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
            sandbox.stub(spawn, "run").rejects(new Error('Nee!'));
            try {
                await parser.tokenize(phpCode);
                assert.fail('Call to PHP should have failed');
            } catch(e) {
                assert.equal(e.message, 'Nee!');
            }
        });
    });

    suite("getEntities", () => {
        test("should return a list of entities", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves(fakeTokens)
                .withArgs(phpCode);
            const result = await parser.getEntities(phpCode);
            assert.equal(result.length, 4);
            assert.equal(true, result[0] instanceof PHPUseInfo);
            assert.equal(result[0].fullName, "My_Test_Module\\");
            assert.equal(result[0].namespace, "My_Test_Module");
            assert.equal(true, result[1] instanceof PHPClassInfo);
            assert.equal(result[1].fullName, "MyTestNamespace\\MyCommentedClass");
            assert.equal(result[1].namespace, "MyTestNamespace");
            assert.equal(true, result[2] instanceof PHPClassInfo);
            assert.equal(result[2].fullName, "MyTestNamespace\\MyUncommentedClass");   
            assert.equal(result[2].namespace, "MyTestNamespace");
            assert.equal(true, result[3] instanceof PHPFunctionInfo);
            assert.equal(result[3].fullName, "MyTestNamespace\\standaloneTest");   
            assert.equal(result[3].namespace, "MyTestNamespace");
        });
        
        test("should fail to return a list of entities if parse fails", (done) => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .withArgs(phpCode)
                .resolves(fakeTokens);
            sandbox.stub(parser, "parse")
                .withArgs(fakeTokens)
                .returns(undefined);

            parser.getEntities(phpCode).then(() => {
                sinon.assert.fail('Should have failed with Unable to retrieve PHP entities');
                done();
            }).catch(e => {
                assert.equal(e.message, 'Unable to retrieve PHP entities');
                done();
            });
        });
    });

    suite("getTestableEntities", () => {
        test("should return a testable entity", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves(fakeTokens)
                .withArgs(phpCode);
            const result = await parser.getTestableEntities(phpCode);
            assert.equal(result.length, 3);
            assert.equal(result[0].fullName, "MyTestNamespace\\MyCommentedClass");
            assert.equal(result[0].namespace, "MyTestNamespace");
            assert.equal(result[1].fullName, "MyTestNamespace\\MyUncommentedClass");   
            assert.equal(result[1].namespace, "MyTestNamespace");
            assert.equal(result[2].fullName, "MyTestNamespace\\standaloneTest");   
            assert.equal(result[2].namespace, "MyTestNamespace");
        });

        test("should fail on testable entity if there is a parse fail", (done) => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves([])
                .withArgs(phpCode);
            parser.getTestableEntities(phpCode).then(() => {
                sinon.assert.fail('Should have failed with No PHP tokens found to parse');
                done();
            }).catch(e => {
                assert.equal(e.message, 'No PHP tokens found to parse');
                done();
            });
        });
    });

    suite("getEntityAtLineNumber", () => {
        test("should return TestMethod1 function when positioned inside of function", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves(fakeTokens)
                .withArgs(phpCode);
            const result = await parser.getEntityAtLineNumber(phpCode, 14);
            if(result instanceof PHPEntityInfo) {
                assert.equal(result.name, "TestMethod1", "TestMethod1 incorrect name");
                assert.equal(result.startLineNumber, 15, "TestMethod1 incorrect start");
                assert.equal(result.endLineNumber, 22, "TestMethod1 incorrect end");
            } else {
                assert.fail(result, ! undefined, "TestMethod1 was not detected" );
            }
        });

        test("should return TestMethod1 function when positioned in function comment", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves(fakeTokens)
                .withArgs(phpCode);
            const result = await parser.getEntityAtLineNumber(phpCode, 13);
            if(result instanceof PHPEntityInfo) {
                assert.equal(result.name, "TestMethod1", "TestMethod1 incorrect name");
                assert.equal(result.startLineNumber, 15, "TestMethod1 incorrect start");
                assert.equal(result.endLineNumber, 22, "TestMethod1 incorrect end");
            } else {
                assert.fail(result, ! undefined, "TestMethod1 was not detected" );
            }
        });

        test("should return TestUncommentedClass when positioned at end of class", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves(fakeTokens)
                .withArgs(phpCode);
            const result = await parser.getEntityAtLineNumber(phpCode, 39);
            if(result instanceof PHPEntityInfo) {
                assert.equal(result.name, "MyUncommentedClass", "MyUncommentedClass incorrect name");
                assert.equal(result.startLineNumber, 35, "MyUncommentedClass incorrect start");
                assert.equal(result.endLineNumber, 39, "MyUncommentedClass incorrect end");
            } else {
                assert.fail(result, ! undefined, "MyUncommentedClass was not detected" );
            }
        });
        
        test("should return standalone function", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves(fakeTokens)
                .withArgs(phpCode);
            const result = await parser.getEntityAtLineNumber(phpCode, 42);
            if(result instanceof PHPEntityInfo) {
                assert.equal(result.name, "standaloneTest", "standaloneTest incorrect name");
                assert.equal(result.startLineNumber, 41, "standaloneTest incorrect start");
                assert.equal(result.endLineNumber, 43, "standaloneTest incorrect end");
            } else {
                assert.fail(result, ! undefined, "standaloneTest was not detected" );
            }
        });

        test("should fail when PHP is invalid", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves([])
                .withArgs(phpCode);
            try {
                await parser.getEntityAtLineNumber(phpCode, 14);
                assert.fail("Should have failed with No PHP tokens found to parse");
            } catch(e) {
                assert.equal(e.message, "No PHP tokens found to parse");
            }
        });

        test("should return undefined if invalid line number specified", async () => {
            const ui = new VisualCodeShimMock();
            const spawn = new SpawnService(ui);
            const parser = new PHPFileParserService(() => {
                return spawn;
            }, ui);
            sandbox.stub(parser, "tokenize")
                .resolves(fakeTokens)
                .withArgs(phpCode);
            sandbox.stub(parser, "parse")
                .resolves(undefined)
                .withArgs([phpCode, 14]);
            assert.equal(await parser.getEntityAtLineNumber(phpCode, 14), undefined);
        });

    });

    suite("getNextDescriptorOnLine", () => {
        test("should return text before whitespace from getNextNonEmptyTextOnLine", () => {
            assert.equal('foo', PHPFileParserService.getNextDescriptorOnLine(0, 100, [[0, 'use ', 100], [1, 'foo', 100], '\t']));
        });

        test("should return consecutive text before whitespace from getNextNonEmptyTextOnLine", () => {
            assert.equal('foo_bar', PHPFileParserService.getNextDescriptorOnLine(0, 100, [[0, 'use ', 100], [1, 'foo', 100], [2, '_', 100], [3, 'bar', 100], [4, '\t', 100]]));
        });
    
        test("should return empty after lineNo when token isn't an array", () => {
            assert.equal('', PHPFileParserService.getNextDescriptorOnLine(0, 1, [[], 'foo', 'bar']));
        });
    
        test("should return empty when token is a line after lineNo", () => {
            assert.equal('', PHPFileParserService.getNextDescriptorOnLine(0, 1, [[], [1, 4, 777], '']));
        });
    
        test("should return empty when ctr is past limit", () => {
            assert.equal('', PHPFileParserService.getNextDescriptorOnLine(100, 1, [[], [1, 4, 777], '']));
        });
    });

    suite("isLineClassOrFunction", () => {
        test("should return true on class", () => {
            assert.equal(true, PHPFileParserService.isLineClassOrFunction(1, 100, [' ', [1, 'class', 100], [2, 'fubar', 100]]));
        });

        test("should return true on function", () => {
            assert.equal(true, PHPFileParserService.isLineClassOrFunction(1, 100, [' ', [1, 'function', 100], [2, 'fubar', 100]]));
        });

        test("should return false after lineNo when token isn't whitespace or an array", () => {
            assert.equal(false, PHPFileParserService.isLineClassOrFunction(0, 99, ['xxx', [0, 'blah', 99], [1, 'function', 100], [2, 'fubar', 100]]));
        });
    
        test("should return empty when token is a line after lineNo", () => {
            assert.equal(false, PHPFileParserService.isLineClassOrFunction(1, 80, [[0, 'blah', 99], [1, 'function', 100], [2, 'fubar', 100]]));
        });
    
        test("should return empty from getNextNonEmptyTextOnLine when ctr is past limit", () => {
            assert.equal(false, PHPFileParserService.isLineClassOrFunction(100, 99, [[0, 'blah', 99], [1, 'function', 100], [2, 'fubar', 100]]));
        });
    });
});