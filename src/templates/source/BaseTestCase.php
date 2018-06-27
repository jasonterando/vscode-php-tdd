<?php
namespace PHPTDD;
use PHPUnit\Framework\TestCase;

/**
 * Include functionality for accessing protected/private members and methods
 */
abstract class BaseTestCase extends TestCase {

    protected static function setProperty($object, $propertyName, $propertyValue) {
        $reflection = new ReflectionClass($object);
        $reflection_property = $reflection->getProperty($propertyName);
        $reflection_property->setAccessible(true);
        $reflection_property->setValue($object, $propertyValue);
    }

    protected static function getProperty($object, $propertyName) {
        $reflection = new ReflectionClass($object);
        $reflection_property = $reflection->getProperty($propertyName);
        $reflection_property->setAccessible(true);
        return $reflection_property->getValue($object);
    }

    protected static function callMethod($object, $methodName, $arguments = []) {
        $reflection = new ReflectionClass($object);
        $reflection_method = $reflection->getMethod($methodName);
        $reflection_method->setAccessible(true);
        return $reflection_method->invokeArgs($object, $arguments);
    }
}
