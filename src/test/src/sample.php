<?php
namespace MyTestNamespace;

use My_Test_Module;

/**
 * This is a test class
 */
class MyCommentedClass {
    // Inline parameter
    private $foo = 1;

    // Inline comment style
    // for TestMethod 1
    protected function TestMethod1() {
        // Do nothing
        function foo() {
            return "Bing!";
        }

        return foo();
    }

    // Make sure we ignore quoted stuff
    protected function TestMethod3() {
        echo "Double quote stuff: 
        function bogus1() {}
        ";
        echo "Single quote stuff: 
        function bogus2() {}
        ";
    }
}

class MyUncommentedClass {
    function TestMethod1() {
        return 123;
    }
}

function standaloneTest() {
    return "foo";
}

echo "Begin:" . PHP_EOL;
$test = new MyTestClass();
echo $test->TestMethod1();