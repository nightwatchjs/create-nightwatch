const assert = require('assert');
const mockery = require('mockery');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(process.cwd(), 'test_output');

describe('init tests', () => {
  describe('test askQuestions', () => {
    beforeEach(() => {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('if answers passed to inquirer prompt contains rootDir and onlyConfig', async (done) => {
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          return answers;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      nightwatchInit.onlyConfig = true;
      const answers = await nightwatchInit.askQuestions();

      assert.strictEqual('rootDir' in answers, true);
      assert.strictEqual('onlyConfig' in answers, true);

      assert.equal(answers['rootDir'], rootDir);
      assert.equal(answers['onlyConfig'], true);

      done();
    });
  });

  describe('test refineAnswers', () => {
    beforeEach(() => {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('with just both in answers', () => {
      mockery.registerMock('fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {backend: 'both'};
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('seleniumServer' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);

      const browsers = ['firefox', 'chrome', 'edge', 'safari', 'ie'];
      assert.deepEqual(answers['remoteBrowsers'], browsers);
      if (process.platform !== 'darwin') {browsers.splice(3, 1)}
      assert.deepEqual(answers['browsers'], browsers);

      assert.strictEqual(answers['remoteName'], 'remote');
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['testsLocation'], 'nightwatch-e2e');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch-e2e');
      // since ie is present in browsers
      assert.strictEqual(answers['seleniumServer'], true);
    });

    test('with local and testsLocation (non-existent) in answers', () => {
      mockery.registerMock('fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'local',
        browsers: ['firefox', 'chrome', 'edge'],
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);

      assert.deepEqual(answers['browsers'], ['firefox', 'chrome', 'edge']);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'tests');
    });

    test('with local and testsLocation (exist but empty) in answers', () => {
      mockery.registerMock('fs', {
        existsSync: () => true,
        readdirSync: () => []
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'local',
        browsers: ['firefox', 'chrome', 'edge'],
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);

      assert.deepEqual(answers['browsers'], ['firefox', 'chrome', 'edge']);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'tests');
    });

    test('with local and testsLocation (exist and non-empty) in answers', () => {
      mockery.registerMock('fs', {
        existsSync: () => true,
        readdirSync: () => ['file.txt']
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'local',
        browsers: ['firefox', 'chrome', 'edge'],
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);

      assert.deepEqual(answers['browsers'], ['firefox', 'chrome', 'edge']);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], path.join('tests', 'nightwatch-examples'));
    });

    test('with both (without browserstack) and cucumber runner in answers', () => {
      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'both',
        runner: 'cucumber',
        browsers: ['firefox', 'chrome', 'edge', 'selenium-server'],
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('seleniumServer' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);

      assert.strictEqual(answers['remoteName'], 'remote');
      assert.deepEqual(answers['browsers'], ['firefox', 'chrome', 'edge']);
      assert.deepEqual(answers['remoteBrowsers'], ['firefox', 'chrome', 'edge']);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['seleniumServer'], true);
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch-examples');
    });

    test('with remote as browserstack in answers and onlyConfig flag', () => {
      mockery.registerMock('fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'remote',
        hostname: 'hub.browserstack.com',
        browsers: ['firefox', 'chrome', 'edge', 'ie'],
        testsLocation: 'tests'
      };
      nightwatchInit.onlyConfig = true;

      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('browsers' in answers, false);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('addExamples' in answers, false);
      assert.strictEqual('examplesLocation' in answers, false);

      assert.strictEqual(answers['remoteName'], 'browserstack');
      assert.deepEqual(answers['remoteBrowsers'], ['firefox', 'chrome', 'edge', 'ie']);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
    });
  });

  describe('test identifyPackagesToInstall', () => {
    beforeEach(() => {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('correct packages are installed with ts-mocha-seleniumServer', () => {
      mockery.registerMock('fs', {
        readFileSync(path, encoding) {
          return `{
            "devDependencies": {
              "typescript": ""
            }
          }`;
        }
      });

      const answers = {
        language: 'ts',
        runner: 'mocha',
        seleniumServer: true
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      const packagesToInstall = nightwatchInit.identifyPackagesToInstall(answers);

      assert.strictEqual(packagesToInstall.includes('nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('typescript'), false);
      assert.strictEqual(packagesToInstall.includes('@types/nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('@cucumber/cucumber'), false);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/selenium-server'), true);
    });

    test('correct packages are installed with js-cucumber', () => {
      mockery.registerMock('fs', {
        readFileSync(path, encoding) {
          return `{
            "dependencies": {
              "nightwatch": ""
            }
          }`;
        }
      });

      const answers = {
        language: 'js',
        runner: 'cucumber'
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      const packagesToInstall = nightwatchInit.identifyPackagesToInstall(answers);

      assert.strictEqual(packagesToInstall.includes('nightwatch'), false);
      assert.strictEqual(packagesToInstall.includes('typescript'), false);
      assert.strictEqual(packagesToInstall.includes('@types/nightwatch'), false);
      assert.strictEqual(packagesToInstall.includes('@cucumber/cucumber'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/selenium-server'), false);
    });

    test('correct packages are installed with ts-cucumber-seleniumServer without initial packages', () => {
      mockery.registerMock('fs', {
        readFileSync(path, encoding) {
          return '{}';
        }
      });

      const answers = {
        language: 'ts',
        runner: 'cucumber',
        seleniumServer: true
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      const packagesToInstall = nightwatchInit.identifyPackagesToInstall(answers);

      assert.strictEqual(packagesToInstall.includes('nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('typescript'), true);
      assert.strictEqual(packagesToInstall.includes('@types/nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('@cucumber/cucumber'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/selenium-server'), true);
    });
  });

  describe('test installPackages', () => {
    beforeEach(() => {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('packages are installed correctly with correct output', () => {
      const consoleOutput = [];
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

      const commandsExecuted = [];
      mockery.registerMock('child_process', {
        execSync(command, options) {
          commandsExecuted.push(command);
        }
      });

      const packagesToInstall = ['nightwatch', '@types/nightwatch', '@nightwatch/selenium-server'];

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      nightwatchInit.installPackages(packagesToInstall);

      // Check the commands executed
      assert.strictEqual(commandsExecuted.length, 3);
      assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
      assert.strictEqual(commandsExecuted[1], 'npm install @types/nightwatch --save-dev');
      assert.strictEqual(commandsExecuted[2], 'npm install @nightwatch/selenium-server --save-dev');

      const output = consoleOutput.toString();
      // 3 packages are installed
      assert.strictEqual((output.match(/- /g) || []).length, 3);
      assert.strictEqual((output.match(/Installing/g) || []).length, 4);
      assert.strictEqual((output.match(/Done!/g) || []).length, 3);
      // Check the packages installed
      assert.strictEqual(output.includes('nightwatch'), true);
      assert.strictEqual(output.includes('@types/nightwatch'), true);
      assert.strictEqual(output.includes('@nightwatch/selenium-server'), true);
    });
  });

  describe('test setupTypesript', () => {
    beforeEach(() => {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('with tsconfig not present and default test in package.json', () => {
      let tsconfigCopied = false;
      let writtenPackageJson = '';

      const tsconfigToCopy = `{
        "compilerOptions": {
          "outDir": "dist"
        }
      }`;
      const packageJson = `{
        "scripts": {
          "test": "echo \\"Error: no test specified\\" && exit 1"
        }
      }`;

      mockery.registerMock('fs', {
        existsSync(path) {
          return false;
        },
        copyFileSync(src, dest) {
          tsconfigCopied = true;
        },
        readFileSync(path, encoding) {
          if (path.endsWith('package.json')) {return packageJson} else {return tsconfigToCopy}
        },
        writeFileSync(path, content) {
          writtenPackageJson = content;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(tsconfigCopied, true);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, 'dist');
      assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, 'test');
      assert.strictEqual(JSON.parse(writtenPackageJson).scripts.test, 'tsc && nightwatch');
    });

    test('with tsconfig and test script already present', () => {
      let tsconfigCopied = false;
      let writtenPackageJson = '';

      const tsconfigAlreadyPresent = `{
        "compilerOptions": {
          "outDir": "lib"
        }
      }`;
      const currentPackageJson = `{
        "scripts": {
          "test": "nightwatch --env chrome"
        }
      }`;

      mockery.registerMock('fs', {
        existsSync(path) {
          return true;
        },
        copyFileSync(src, dest) {
          tsconfigCopied = true;
        },
        readFileSync(path, encoding) {
          if (path.endsWith('package.json')) {return currentPackageJson} else {return tsconfigAlreadyPresent}
        },
        writeFileSync(path, content) {
          writtenPackageJson = content;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(tsconfigCopied, false);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, 'lib');
      assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, 'nightwatch:test');
      assert.strictEqual(JSON.parse(writtenPackageJson).scripts['nightwatch:test'], 'tsc && nightwatch');
    });

    test('with nothing in tsconfig and test and nightwatch:test scripts already present', () => {
      let tsconfigCopied = false;
      let writtenPackageJson = '';

      const tsconfigAlreadyPresent = '{}';
      const currentPackageJson = `{
        "scripts": {
          "test": "nightwatch --env chrome",
          "nightwatch:test": "tsc && nightwatch -- --env chrome"
        }
      }`;

      mockery.registerMock('fs', {
        existsSync(path) {
          return true;
        },
        copyFileSync(src, dest) {
          tsconfigCopied = true;
        },
        readFileSync(path, encoding) {
          if (path.endsWith('package.json')) {return currentPackageJson} else {return tsconfigAlreadyPresent}
        },
        writeFileSync(path, content) {
          writtenPackageJson = content;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(tsconfigCopied, false);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
      assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, 'nightwatch:test:new');
      assert.strictEqual(JSON.parse(writtenPackageJson).scripts['nightwatch:test:new'], 'tsc && nightwatch');
    });

    test('with no outDir in tsconfig and test, nightwatch:test and nightwatch:test:new scripts already present', () => {
      let tsconfigCopied = false;
      let writtenPackageJson = '';

      const tsconfigAlreadyPresent = `{
        "compilerOptions": {}
      }`;
      const currentPackageJson = `{
        "scripts": {
          "test": "nightwatch --env chrome",
          "nightwatch:test": "tsc && nightwatch -- --env chrome",
          "nightwatch:test:new": "tsc && nightwatch -- --env edge"
        }
      }`;

      mockery.registerMock('fs', {
        existsSync(path) {
          return true;
        },
        copyFileSync(src, dest) {
          tsconfigCopied = true;
        },
        readFileSync(path, encoding) {
          if (path.endsWith('package.json')) {return currentPackageJson} else {return tsconfigAlreadyPresent}
        },
        writeFileSync(path, content) {
          writtenPackageJson = content;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(tsconfigCopied, false);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
      assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, 'nightwatch:test:new');
      assert.strictEqual(JSON.parse(writtenPackageJson).scripts['nightwatch:test:new'], 'tsc && nightwatch');
    });
  });

  describe('test getConfigDestPath', () => {
    beforeEach(() => {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('if config file is not already present', async (done) => {
      const consoleOutput = [];
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

      mockery.registerMock('fs', {
        existsSync(path) {
          return false;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      const configExpPath = path.join(rootDir, 'nightwatch.conf.js');

      assert.strictEqual(configDestPath, configExpPath);

      done();
    });

    test('if config file is already present and overwrite in prompt', async (done) => {
      const consoleOutput = [];
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

      mockery.registerMock('fs', {
        existsSync(path) {
          return true;
        }
      });

      mockery.registerMock('inquirer', {
        async prompt() {
          return {overwrite: true};
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      const configExpPath = path.join(rootDir, 'nightwatch.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);
      assert.strictEqual(configDestPath, configExpPath);

      done();
    });

    test('if config file is already present and new file in prompt', async (done) => {
      const consoleOutput = [];
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

      mockery.registerMock('fs', {
        existsSync(path) {
          return true;
        }
      });

      const configFileNameInitials = 'new-config';
      const configFileName = `${configFileNameInitials}.conf.js`;
      mockery.registerMock('inquirer', {
        async prompt() {
          return {overwrite: false, newFileName: configFileNameInitials};
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      const configExpPath = path.join(rootDir, configFileName);

      assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, configFileName);
      assert.strictEqual(configDestPath, configExpPath);

      done();
    });
  });

  describe('test generateConfig', () => {
    beforeEach(() => {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('generateConfig with js and without testsLocation and examplesLocation', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      const answers = {
        language: 'js',
        backend: 'local',
        browsers: ['chrome', 'firefox'],
        defaultBrowser: 'firefox'
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, undefined);
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);

      assert.deepEqual(config.src_folders, []);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'firefox', 'chrome']);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js with testsLocation and examplesLocation', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      const answers = {
        language: 'js',
        backend: 'both',
        browsers: ['chrome'],
        remoteBrowsers: ['chrome', 'firefox'],
        host: 'localhost',
        port: 4444,
        defaultBrowser: 'chrome',
        remoteName: 'remote',
        seleniumServer: true,
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: path.join('tests', 'nightwatch-examples')
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('tests', 'nightwatch-examples'));

      assert.deepEqual(config.src_folders, ['tests']);
      assert.deepEqual(config.page_objects_path, [path.join('tests', 'nightwatch-examples', 'page-objects')]);
      assert.deepEqual(config.custom_commands_path, [path.join('tests', 'nightwatch-examples', 'custom-commands')]);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'remote',
        'remote.chrome',
        'remote.firefox',
        'selenium_server',
        'selenium.chrome'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js with cucumber, testsLocation, and examplesLocation', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      const answers = {
        language: 'js',
        runner: 'cucumber',
        backend: 'both',
        browsers: ['chrome'],
        remoteBrowsers: ['chrome', 'firefox'],
        host: 'localhost',
        port: 4444,
        defaultBrowser: 'chrome',
        remoteName: 'remote',
        seleniumServer: true,
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'tests'
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);

      assert.deepEqual(config.src_folders, ['tests']);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'remote',
        'remote.chrome',
        'remote.firefox',
        'selenium_server',
        'selenium.chrome'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with ts with testsLocation and examplesLocation', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      const answers = {
        language: 'ts',
        backend: 'remote',
        browsers: ['chrome'],
        remoteBrowsers: ['chrome', 'firefox'],
        host: 'hub.browserstack.com',
        port: 4444,
        defaultBrowser: 'chrome',
        browserstack: true,
        remoteName: 'browserstack',
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'nightwatch-examples'
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      nightwatchInit.otherInfo.tsOutDir = 'dist';

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, path.join('dist', 'tests'));
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('dist', 'nightwatch-examples'));

      assert.deepEqual(config.src_folders, [path.join('dist', 'tests'), path.join('dist', 'nightwatch-examples')]);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.firefox',
        'browserstack.local_chrome',
        'browserstack.local_firefox'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');

      fs.unlinkSync('test_config.conf.js');
    });
  });
});
