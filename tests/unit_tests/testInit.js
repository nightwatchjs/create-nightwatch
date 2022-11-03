const assert = require('assert');
const mockery = require('mockery');
const fs = require('node:fs');
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

    test('if answers passed to inquirer contains rootDir and onlyConfig by default', async () => {
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          return answers;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, {});
      const answers = await nightwatchInit.askQuestions();

      assert.deepStrictEqual(Object.keys(answers), ['rootDir', 'onlyConfig', 'browsers']);

      assert.strictEqual(answers['rootDir'], rootDir);
      assert.strictEqual(answers['onlyConfig'], false);
      assert.strictEqual(answers['browsers'], undefined);
    });

    test('if answers passed to inquirer also contains browsers and mobile when flags passed', async () => {
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          return answers;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, {browser: ['firefox'], mobile: true, 'generate-config': true});
      // marking it here because nightwatchInit.run is not run
      nightwatchInit.onlyConfig = true;
      const answers = await nightwatchInit.askQuestions();

      assert.deepStrictEqual(Object.keys(answers), ['rootDir', 'onlyConfig', 'browsers', 'mobile']);

      assert.strictEqual(answers['rootDir'], rootDir);
      assert.strictEqual(answers['onlyConfig'], true);
      assert.deepStrictEqual(answers['browsers'], ['firefox']);
      assert.strictEqual(answers['mobile'], true);
    });

    test('if answers passed to inquirer contains correct property when mobile flag passed with wrong type', async () => {
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          return answers;
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, {browser: ['firefox'], mobile: 'random'});
      const answers = await nightwatchInit.askQuestions();

      
      assert.deepStrictEqual(Object.keys(answers), ['rootDir', 'onlyConfig', 'browsers', 'mobile']);

      assert.strictEqual(answers['rootDir'], rootDir);
      assert.strictEqual(answers['onlyConfig'], false);
      assert.deepStrictEqual(answers['browsers'], ['firefox']);
      assert.strictEqual(answers['mobile'], true);
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
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {backend: 'both'};
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobileDevice' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);

      assert.deepEqual(answers['browsers'], []);
      assert.deepEqual(answers['remoteBrowsers'], []);
      assert.deepEqual(answers['mobileBrowsers'], []);
      assert.strictEqual(answers['remoteName'], undefined);
      assert.strictEqual(answers['remoteEnv'].username, 'REMOTE_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'REMOTE_ACCESS_KEY');
      assert.strictEqual(answers['defaultBrowser'], 'chrome');
      assert.strictEqual(answers['testsLocation'], 'nightwatch-e2e');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
    });

    test('with local and no mobile and testsLocation (non-existent) in answers', () => {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'local',
        browsers: ['firefox', 'chrome', 'edge', 'safari'],
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobileDevice' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('remoteEnv' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, true);

      const browsers = ['firefox', 'chrome', 'edge', 'safari'];
      if (process.platform !== 'darwin') {browsers.splice(3, 1)}
      assert.deepEqual(answers['browsers'], browsers);

      assert.deepEqual(answers['mobileBrowsers'], []);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['seleniumServer'], true);
    });

    test('with local and mobile with no mobileBrowsers', () => {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'local',
        browsers: ['chrome', 'firefox', 'edge', 'safari'],
        mobile: true
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('mobile' in answers, true);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobileDevice' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('remoteEnv' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, true);

      const browsers = ['chrome', 'firefox', 'edge', 'safari'];
      if (process.platform !== 'darwin') {browsers.splice(3, 1)}
      assert.deepEqual(answers['browsers'], browsers);

      const mobileBrowsers = ['chrome', 'firefox', 'safari'];
      if (process.platform !== 'darwin') {mobileBrowsers.splice(2, 1)}
      assert.deepEqual(answers['mobileBrowsers'], mobileBrowsers);

      assert.strictEqual(answers['defaultBrowser'], 'chrome');
      assert.strictEqual(answers['testsLocation'], 'nightwatch-e2e');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['seleniumServer'], true);
      if (process.platform === 'darwin') {
        assert.strictEqual(answers['mobileDevice'], 'both');
      } else {
        assert.strictEqual(answers['mobileDevice'], 'android');
      }
    });

    test('with local and mobile with mobile flag', () => {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'local',
        mobileBrowsers: ['safari'],
        mobile: true
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('mobile' in answers, true);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('remoteEnv' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);

      assert.deepEqual(answers['browsers'], []);
      assert.strictEqual(answers['testsLocation'], 'nightwatch-e2e');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      if (process.platform === 'darwin') {
        assert.deepEqual(answers['mobileBrowsers'], ['safari']);
        assert.strictEqual(answers['defaultBrowser'], 'safari');
        assert.strictEqual('mobileDevice' in answers, true);
        assert.strictEqual(answers['mobileDevice'], 'ios');
      } else {
        assert.deepEqual(answers['mobileBrowsers'], []);
        assert.strictEqual(answers['defaultBrowser'], 'chrome');
        assert.strictEqual('mobileDevice' in answers, false);
      }
    });

    test('with remote (browserstack) and testsLocation (exist but empty) in answers', () => {
      mockery.registerMock('node:fs', {
        existsSync: () => true,
        readdirSync: () => []
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'remote',
        cloudProvider: 'browserstack',
        browsers: ['firefox', 'chrome', 'edge'],
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, false);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, false);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobileDevice' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);

      assert.deepEqual(answers['remoteBrowsers'], ['firefox', 'chrome', 'edge']);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['cloudProvider'], 'browserstack');
      assert.strictEqual(answers['remoteName'], 'browserstack');
      assert.strictEqual(answers['remoteEnv'].username, 'BROWSERSTACK_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'BROWSERSTACK_ACCESS_KEY');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
    });

    test('with remote (saucelabs) and mobile and testsLocation (exist and non-empty) in answers', () => {
      mockery.registerMock('node:fs', {
        existsSync: () => true,
        readdirSync: () => ['file.txt']
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'remote',
        cloudProvider: 'saucelabs',
        browsers: ['firefox', 'chrome', 'safari'],
        testsLocation: 'tests',
        mobile: true
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, false);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, true);
      assert.strictEqual('mobileBrowsers' in answers, false);
      assert.strictEqual('mobileRemote' in answers, true);
      assert.strictEqual('mobileDevice' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);

      assert.deepStrictEqual(answers['remoteBrowsers'], ['firefox', 'chrome', 'safari']);
      assert.strictEqual(answers['mobileRemote'], true);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['cloudProvider'], 'saucelabs');
      assert.strictEqual(answers['remoteName'], 'saucelabs');
      assert.strictEqual(answers['remoteEnv'].username, 'SAUCE_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'SAUCE_ACCESS_KEY');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
    });

    test('with remote (other) in answers and onlyConfig flag and mobile with mobile flag', () => {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'remote',
        cloudProvider: 'other',
        testsLocation: 'tests',
        mobile: true
      };
      nightwatchInit.onlyConfig = true;

      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, false);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, true);
      assert.strictEqual('mobileBrowsers' in answers, false);
      assert.strictEqual('mobileRemote' in answers, true);
      assert.strictEqual('mobileDevice' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('addExamples' in answers, false);
      assert.strictEqual('examplesLocation' in answers, false);

      assert.deepEqual(answers['remoteBrowsers'], []);
      assert.strictEqual(answers['mobileRemote'], true);
      assert.strictEqual(answers['defaultBrowser'], 'chrome');
      assert.strictEqual(answers['cloudProvider'], 'other');
      assert.strictEqual(answers['remoteName'], 'remote');
      assert.strictEqual(answers['remoteEnv'].username, 'REMOTE_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'REMOTE_ACCESS_KEY');
    });

    test('with both (remote - other) and cucumber runner in answers', () => {
      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'both',
        cloudProvider: 'other',
        runner: 'cucumber',
        browsers: ['firefox', 'chrome', 'edge'],
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobileDevice' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('seleniumServer' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);

      assert.deepEqual(answers['browsers'], ['firefox', 'chrome', 'edge']);
      assert.deepEqual(answers['remoteBrowsers'], ['firefox', 'chrome', 'edge']);
      assert.deepEqual(answers['mobileBrowsers'], []);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['cloudProvider'], 'other');
      assert.strictEqual(answers['remoteName'], 'remote');
      assert.strictEqual(answers['remoteEnv'].username, 'REMOTE_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'REMOTE_ACCESS_KEY');
      assert.strictEqual(answers['seleniumServer'], true);
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
    });

    test('with both (remote - other) and mobile with mobile flag', () => {
      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      let answers = {
        backend: 'both',
        cloudProvider: 'other',
        mobileBrowsers: ['firefox', 'chrome', 'safari'],
        testsLocation: 'tests',
        mobile: true
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, true);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, true);
      assert.strictEqual('mobileDevice' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);

      assert.deepStrictEqual(answers['browsers'], []);
      assert.deepStrictEqual(answers['remoteBrowsers'], []);
      if (process.platform === 'darwin') {
        assert.deepStrictEqual(answers['mobileBrowsers'], ['firefox', 'chrome', 'safari']);
        assert.strictEqual(answers['mobileDevice'], 'both');
      } else {
        assert.deepStrictEqual(answers['mobileBrowsers'], ['firefox', 'chrome']);
        assert.strictEqual(answers['mobileDevice'], 'android');
      }
      assert.strictEqual(answers['mobileRemote'], true);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['cloudProvider'], 'other');
      assert.strictEqual(answers['remoteName'], 'remote');
      assert.strictEqual(answers['remoteEnv'].username, 'REMOTE_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'REMOTE_ACCESS_KEY');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
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
      mockery.registerMock('node:fs', {
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
      mockery.registerMock('node:fs', {
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
      mockery.registerMock('node:fs', {
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

    test('with both tsconfig not present', () => {
      let nwTsconfigCopied = false;

      mockery.registerMock('node:fs', {
        existsSync() {
          return false;
        },
        copyFileSync() {
          nwTsconfigCopied = true;
        }
      });

      const commandsExecuted = [];
      mockery.registerMock('child_process', {
        execSync(command) {
          commandsExecuted.push(command);
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(commandsExecuted.length, 1);
      assert.strictEqual(commandsExecuted[0], 'npx tsc --init');

      assert.strictEqual(nwTsconfigCopied, true);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
    });

    test('with both tsconfig already present', () => {
      let nwTsconfigCopied = false;

      mockery.registerMock('node:fs', {
        existsSync() {
          return true;
        },
        copyFileSync() {
          nwTsconfigCopied = true;
        }
      });

      const commandsExecuted = [];
      mockery.registerMock('child_process', {
        execSync(command) {
          commandsExecuted.push(command);
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(commandsExecuted.length, 0);
      assert.strictEqual(nwTsconfigCopied, false);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
    });

    test('with tsconfig.nightwatch.json already present', () => {
      let nwTsconfigCopied = false;

      mockery.registerMock('node:fs', {
        existsSync(path) {
          if (path.endsWith('tsconfig.nightwatch.json')) {
            return true;
          }

          return false;
        },
        copyFileSync() {
          nwTsconfigCopied = true;
        }
      });

      const commandsExecuted = [];
      mockery.registerMock('child_process', {
        execSync(command) {
          commandsExecuted.push(command);
        }
      });

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(commandsExecuted.length, 1);
      assert.strictEqual(commandsExecuted[0], 'npx tsc --init');

      assert.strictEqual(nwTsconfigCopied, false);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
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

      mockery.registerMock('node:fs', {
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

      mockery.registerMock('node:fs', {
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

      mockery.registerMock('node:fs', {
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
        mobileBrowsers: [],
        defaultBrowser: 'firefox',
        allowAnonymousMetrics: false
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
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'firefox', 'chrome']);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js (local with mobile) and same testsLocation and examplesLocation', () => {
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
        mobileBrowsers: ['chrome', 'firefox'],
        defaultBrowser: 'firefox',
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'tests',
        allowAnonymousMetrics: false,
        mobile: true
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'tests');

      assert.deepEqual(config.src_folders, ['tests/examples']);
      assert.deepEqual(config.page_objects_path, ['tests/page-objects']);
      assert.deepEqual(config.custom_commands_path, ['tests/custom-commands']);
      assert.deepEqual(config.custom_assertions_path, ['tests/custom-assertions']);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'firefox',
        'chrome',
        'android.real.firefox',
        'android.emulator.firefox',
        'android.real.chrome',
        'android.emulator.chrome'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js (local with mobile) with mobile flag', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      const answers = {
        language: 'js',
        backend: 'local',
        browsers: [],
        mobileBrowsers: ['chrome', 'firefox', 'safari'],
        defaultBrowser: 'chrome',
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'tests',
        allowAnonymousMetrics: false,
        mobile: true
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'tests');

      assert.deepEqual(config.src_folders, ['tests/examples']);
      assert.deepEqual(config.page_objects_path, ['tests/page-objects']);
      assert.deepEqual(config.custom_commands_path, ['tests/custom-commands']);
      assert.deepEqual(config.custom_assertions_path, ['tests/custom-assertions']);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'android.real.firefox',
        'android.emulator.firefox',
        'android.real.chrome',
        'android.emulator.chrome',
        'ios.real.safari',
        'ios.simulator.safari'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js with different testsLocation and examplesLocation', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      const answers = {
        language: 'js',
        backend: 'both',
        cloudProvider: 'other',
        browsers: ['chrome'],
        remoteBrowsers: ['chrome', 'firefox'],
        mobileBrowsers: [],
        defaultBrowser: 'chrome',
        remoteName: 'remote',
        remoteEnv: {
          username: 'REMOTE_USERNAME',
          access_key: 'REMOTE_ACCESS_KEY'
        },
        seleniumServer: true,
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: path.join('tests', 'nightwatch-examples'),
        allowAnonymousMetrics: false
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('tests', 'nightwatch-examples'));

      assert.deepEqual(config.src_folders, ['tests', 'tests/nightwatch-examples/examples']);
      assert.deepEqual(config.page_objects_path, ['tests/nightwatch-examples/page-objects']);
      assert.deepEqual(config.custom_commands_path, ['tests/nightwatch-examples/custom-commands']);
      assert.deepEqual(config.custom_assertions_path, ['tests/nightwatch-examples/custom-assertions']);
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
      assert.strictEqual(config.test_settings.remote.selenium.host, '<remote-hostname>');
      assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
      assert.strictEqual(config.test_settings.remote.username, '${REMOTE_USERNAME}');
      assert.strictEqual(config.test_settings.remote.access_key, '${REMOTE_ACCESS_KEY}');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js with cucumber and same testsLocation and examplesLocation', () => {
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
        cloudProvider: 'saucelabs',
        browsers: ['chrome'],
        remoteBrowsers: ['chrome', 'firefox'],
        mobileBrowsers: [],
        defaultBrowser: 'chrome',
        remoteName: 'saucelabs',
        remoteEnv: {
          username: 'SAUCE_USERNAME',
          access_key: 'SAUCE_ACCESS_KEY'
        },
        seleniumServer: true,
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'tests',
        allowAnonymousMetrics: false
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
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'saucelabs',
        'saucelabs.chrome',
        'saucelabs.firefox',
        'selenium_server',
        'selenium.chrome'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
      assert.strictEqual(config.test_settings.default.test_runner.type, 'cucumber');
      assert.strictEqual(config.test_settings.default.test_runner.options.feature_path, '');
      assert.strictEqual(config.test_settings.saucelabs.selenium.host, 'ondemand.saucelabs.com');
      assert.strictEqual(config.test_settings.saucelabs.selenium.port, 443);
      assert.strictEqual(config.test_settings.saucelabs.desiredCapabilities['sauce:options'].username, '${SAUCE_USERNAME}');
      assert.strictEqual(config.test_settings.saucelabs.desiredCapabilities['sauce:options'].accessKey, '${SAUCE_ACCESS_KEY}');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js with cucumber (both and mobile with mobile flag) and different testsLocation and examplesLocation', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      // can be converted to sauce once we have sauce mobile configs
      const answers = {
        language: 'js',
        runner: 'cucumber',
        backend: 'both',
        cloudProvider: 'browserstack',
        browsers: [],
        remoteBrowsers: [],
        mobileBrowsers: ['chrome', 'firefox'],
        mobileRemote: true,
        defaultBrowser: 'chrome',
        remoteName: 'browserstack',
        remoteEnv: {
          username: 'BROWSERSTACK_USERNAME',
          access_key: 'BROWSERSTACK_ACCESS_KEY'
        },
        testsLocation: 'tests',
        featurePath: path.join('tests', 'features'),
        addExamples: true,
        examplesLocation: path.join('tests', 'features', 'nightwatch-examples'),
        allowAnonymousMetrics: false,
        mobile: true
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
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'android.real.firefox',
        'android.emulator.firefox',
        'android.real.chrome',
        'android.emulator.chrome',
        'browserstack',
        'browserstack.local',
        'browserstack.android.chrome',
        'browserstack.ios.safari'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
      assert.strictEqual(config.test_settings.default.test_runner.type, 'cucumber');
      assert.strictEqual(config.test_settings.default.test_runner.options.feature_path, 'tests/features');
      assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
      assert.strictEqual(config.test_settings.browserstack.selenium.port, 443);
      assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].userName, '${BROWSERSTACK_USERNAME}');
      assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].accessKey, '${BROWSERSTACK_ACCESS_KEY}');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with ts (remote with mobile) with testsLocation and examplesLocation', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      const answers = {
        language: 'ts',
        backend: 'remote',
        cloudProvider: 'browserstack',
        browsers: ['chrome'],
        remoteBrowsers: ['chrome', 'firefox'],
        mobileRemote: true,
        defaultBrowser: 'chrome',
        remoteName: 'browserstack',
        remoteEnv: {
          username: 'BROWSERSTACK_USERNAME',
          access_key: 'BROWSERSTACK_ACCESS_KEY'
        },
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'nightwatch-examples',
        allowAnonymousMetrics: false,
        mobile: true
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      nightwatchInit.otherInfo.tsOutDir = 'dist';

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, path.join('dist', 'tests'));
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('dist', 'nightwatch-examples'));

      assert.deepEqual(config.src_folders, ['dist/tests', 'dist/nightwatch-examples']);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.firefox',
        'browserstack.local_chrome',
        'browserstack.local_firefox',
        'browserstack.android.chrome',
        'browserstack.ios.safari'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
      assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
      assert.strictEqual(config.test_settings.browserstack.selenium.port, 443);
      assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].userName, '${BROWSERSTACK_USERNAME}');
      assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].accessKey, '${BROWSERSTACK_ACCESS_KEY}');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js with allowAnonymousMetrics set to false', () => {
      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      mockery.registerMock(
        'uuid',

        class {
          static v4() {
            return '3141-5926-5358-9793';
          }
        }
      );

      const answers = {
        language: 'js',
        backend: 'local',
        browsers: ['chrome', 'firefox'],
        mobileBrowsers: [],
        defaultBrowser: 'firefox',
        allowAnonymousMetrics: false
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);

      assert.strictEqual(nightwatchInit.client_id, '3141-5926-5358-9793');

      nightwatchInit.otherInfo.tsOutDir = 'dist';
      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(config.usage_analytics.enabled, false);
      assert.strictEqual(config.usage_analytics.log_path, './logs/analytics');
      assert.strictEqual(config.usage_analytics.client_id, '3141-5926-5358-9793');

      fs.unlinkSync('test_config.conf.js');
    });

    test('generateConfig with js with allowAnonymousMetrics set to true', () => {
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
        mobileBrowsers: [],
        defaultBrowser: 'firefox',
        allowAnonymousMetrics: true
      };

      const {NightwatchInit} = require('../../lib/init');
      const nightwatchInit = new NightwatchInit(rootDir, []);
      nightwatchInit.otherInfo.tsOutDir = 'dist';

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(config.usage_analytics.enabled, true);

      fs.unlinkSync('test_config.conf.js');
    });
  });
});
