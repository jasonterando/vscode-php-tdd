# Change Log
## 0.0.1
- Initial Release
## 0.0.2
- Update package.json with publisher and repo information
## 0.0.3
- Add logo
## 0.0.4
- Added enablePHPExtensions and associated functionality to load PHP extensions for JSON and tokenization when not compiled into the PHP binary
- Updated dependencies to address NPM audit findings
- Added "await" keywork to async extension calls to workflow
- Added BaseTestCase require statement to bootstrap.php
- Removed duplicate vs-code-shim-mock file
## 0.0.5
- Align version number with previous release
## 0.0.6
- Do not remove existing test directory and existing files in test directory when setting up first unit test
- Use PHPUnit's TestCase if test directory already exists and has its own phpunit.xml
- Update unit test and phpunit.xml templates to be phpunit 9 friendly
- Replace "vscode" with "vscode-test"

## 0.0.7
- Fix to facilitate file names with spaces (thanks "spawnnnnn")

## 0.0.8
- Update dependencies to address vulnerabilities in older packages