const assert = require('assert');
const mockery = require('mockery');
const fs = require('node:fs');
const path = require('path');

function mockLogger(consoleOutput) {
  mockery.registerMock(
    './logger',
    class {
      static error(...msgs) {
        consoleOutput.push(...msgs);
      }
      static info(...msgs) {
        consoleOutput.push(...msgs);
      }
      static warn(...msgs) {
        consoleOutput.push(...msgs);
      }
    }
  );
}

const rootDir = path.join(process.cwd(), 'test_output');

describe('init tests', function() {
  describe('test askQuestions', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('if answers passed to inquirer contains rootDir and onlyConfig by default', async function() {
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          return answers;
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, {});
      const answers = await nightwatchInit.askQuestions();

      assert.deepStrictEqual(Object.keys(answers), ['rootDir', 'onlyConfig', 'browsers']);

      assert.strictEqual(answers['rootDir'], rootDir);
      assert.strictEqual(answers['onlyConfig'], false);
      assert.strictEqual(answers['browsers'], undefined);
    });

    it('answers passed to inquirer also contains browsers, mobile and native when flags passed', async function() {
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          return answers;
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, {
        browser: ['firefox'],
        mobile: true,
        native: true,
        'generate-config': true
      });
      // marking it here because nightwatchInit.run is not run
      nightwatchInit.onlyConfig = true;
      const answers = await nightwatchInit.askQuestions();

      assert.deepStrictEqual(Object.keys(answers), ['rootDir', 'onlyConfig', 'browsers', 'mobile', 'native']);

      assert.strictEqual(answers['rootDir'], rootDir);
      assert.strictEqual(answers['onlyConfig'], true);
      assert.deepStrictEqual(answers['browsers'], ['firefox']);
      assert.strictEqual(answers['mobile'], true);
      assert.strictEqual(answers['native'], true);
    });

    it('answers passed to inquirer contains correct property when mobile flag passed with wrong type', async function() {
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          return answers;
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, {browser: ['firefox'], mobile: 'random'});
      const answers = await nightwatchInit.askQuestions();

      
      assert.deepStrictEqual(Object.keys(answers), ['rootDir', 'onlyConfig', 'browsers', 'mobile']);

      assert.strictEqual(answers['rootDir'], rootDir);
      assert.strictEqual(answers['onlyConfig'], false);
      assert.deepStrictEqual(answers['browsers'], ['firefox']);
      assert.strictEqual(answers['mobile'], true);
    });
  });

  describe('test refineAnswers', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('with just both in answers', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {backend: 'both'};
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobilePlatform' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('baseUrl' in answers, true);

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
      assert.strictEqual(answers['baseUrl'], '');
    });

    it('with local, seleniumServer and no mobile and testsLocation (non-existent) in answers', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        backend: 'local',
        browsers: ['firefox', 'chrome', 'edge', 'safari'],
        testsLocation: 'tests',
        baseUrl: 'http://localhost',
        seleniumServer: true
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobilePlatform' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('remoteEnv' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, true);
      assert.strictEqual('baseUrl' in answers, true);

      const browsers = ['firefox', 'chrome', 'edge', 'safari'];
      if (process.platform !== 'darwin') {browsers.splice(3, 1)}
      assert.deepEqual(answers['browsers'], browsers);

      assert.deepEqual(answers['mobileBrowsers'], []);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['seleniumServer'], true);
      assert.strictEqual(answers['baseUrl'], 'http://localhost');
    });

    it('with local, mobile with no mobileBrowsers, and app testing', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        testingType: ['e2e', 'app'],
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
      assert.strictEqual('mobilePlatform' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('remoteEnv' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('baseUrl' in answers, true);

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
      if (process.platform === 'darwin') {
        assert.strictEqual(answers['mobilePlatform'], 'both');
      } else {
        assert.strictEqual(answers['mobilePlatform'], 'android');
      }
      assert.strictEqual(answers['baseUrl'], '');
    });

    it('with local and mobile with mobile flag and app testing', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        testingType: ['e2e', 'app'],
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
      assert.strictEqual('baseUrl' in answers, true);

      assert.deepEqual(answers['browsers'], []);
      assert.strictEqual(answers['testsLocation'], 'nightwatch-e2e');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['baseUrl'], '');
      if (process.platform === 'darwin') {
        assert.deepEqual(answers['mobileBrowsers'], ['safari']);
        assert.strictEqual(answers['defaultBrowser'], 'safari');
        assert.strictEqual('mobilePlatform' in answers, true);
        assert.strictEqual(answers['mobilePlatform'], 'ios');
      } else {
        assert.deepEqual(answers['mobileBrowsers'], []);
        assert.strictEqual(answers['defaultBrowser'], 'chrome');
        // from app testing
        assert.strictEqual('mobilePlatform' in answers, true);
        assert.strictEqual(answers['mobilePlatform'], 'android');
      }
    });

    it('with local and app testing only', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        testingType: ['app'],
        backend: 'local'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, false);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('mobilePlatform' in answers, true);
      assert.strictEqual('cloudProvider' in answers, false);
      assert.strictEqual('remoteName' in answers, false);
      assert.strictEqual('remoteEnv' in answers, false);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('baseUrl' in answers, true);

      assert.deepEqual(answers['browsers'], []);
      assert.deepEqual(answers['mobileBrowsers'], []);
      assert.strictEqual(answers['testsLocation'], 'nightwatch-e2e');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['baseUrl'], '');
      assert.strictEqual(answers['defaultBrowser'], '');
      assert.strictEqual(answers['mobilePlatform'], 'android');
    });

    it('with remote (browserstack) and testsLocation (exist but empty) in answers', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => true,
        readdirSync: () => []
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

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
      assert.strictEqual('mobilePlatform' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('baseUrl' in answers, true);

      assert.deepEqual(answers['remoteBrowsers'], ['firefox', 'chrome', 'edge']);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['cloudProvider'], 'browserstack');
      assert.strictEqual(answers['remoteName'], 'browserstack');
      assert.strictEqual(answers['remoteEnv'].username, 'BROWSERSTACK_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'BROWSERSTACK_ACCESS_KEY');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['baseUrl'], '');
    });

    it('with remote (saucelabs) and mobile and testsLocation (exist and non-empty) in answers', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => true,
        readdirSync: () => ['file.txt']
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        backend: 'remote',
        cloudProvider: 'saucelabs',
        browsers: ['firefox', 'chrome', 'safari'],
        testsLocation: 'tests',
        baseUrl: 'http://localhost',
        mobile: true
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, false);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, true);
      assert.strictEqual('mobileBrowsers' in answers, false);
      assert.strictEqual('mobileRemote' in answers, true);
      assert.strictEqual('mobilePlatform' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('baseUrl' in answers, true);

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
      assert.strictEqual(answers['baseUrl'], 'http://localhost');
    });

    it('with remote (other) in answers and onlyConfig flag and mobile with mobile flag', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

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
      assert.strictEqual('mobilePlatform' in answers, false);
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

    it('with both (remote - other) and cucumber runner and seleniumServer false', function() {
      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        backend: 'both',
        cloudProvider: 'other',
        runner: 'cucumber',
        browsers: ['firefox', 'chrome', 'edge'],
        testsLocation: 'tests',
        seleniumServer: false
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, true);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, true);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobilePlatform' in answers, false);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('seleniumServer' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('baseUrl' in answers, true);

      assert.deepEqual(answers['browsers'], ['firefox', 'chrome', 'edge']);
      assert.deepEqual(answers['remoteBrowsers'], ['firefox', 'chrome', 'edge']);
      assert.deepEqual(answers['mobileBrowsers'], []);
      assert.strictEqual(answers['defaultBrowser'], 'firefox');
      assert.strictEqual(answers['cloudProvider'], 'other');
      assert.strictEqual(answers['remoteName'], 'remote');
      assert.strictEqual(answers['remoteEnv'].username, 'REMOTE_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'REMOTE_ACCESS_KEY');
      assert.strictEqual(answers['seleniumServer'], false);
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['baseUrl'], '');
    });

    it('with both (remote - other) and mobile with mobile flag', function() {
      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

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
      assert.strictEqual('mobilePlatform' in answers, true);
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
        assert.strictEqual(answers['mobilePlatform'], 'both');
      } else {
        assert.deepStrictEqual(answers['mobileBrowsers'], ['firefox', 'chrome']);
        assert.strictEqual(answers['mobilePlatform'], 'android');
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

    it('with remote (browserstack) and app testing only', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => true,
        readdirSync: () => []
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        testingType: ['app'],
        backend: 'remote',
        cloudProvider: 'browserstack',
        mobilePlatform: 'both',
        testsLocation: 'tests'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('browsers' in answers, false);
      assert.strictEqual('remoteBrowsers' in answers, true);
      assert.strictEqual('mobile' in answers, false);
      assert.strictEqual('mobileBrowsers' in answers, false);
      assert.strictEqual('mobileRemote' in answers, false);
      assert.strictEqual('mobilePlatform' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('defaultBrowser' in answers, true);
      assert.strictEqual('cloudProvider' in answers, true);
      assert.strictEqual('remoteName' in answers, true);
      assert.strictEqual('remoteEnv' in answers, true);
      assert.strictEqual('testsLocation' in answers, true);
      assert.strictEqual('addExamples' in answers, true);
      assert.strictEqual('examplesLocation' in answers, true);
      assert.strictEqual('seleniumServer' in answers, false);
      assert.strictEqual('baseUrl' in answers, true);

      if (process.platform === 'darwin') {
        assert.strictEqual(answers['mobilePlatform'], 'both');
      } else {
        assert.strictEqual(answers['mobilePlatform'], 'android');
      }
      assert.deepEqual(answers['remoteBrowsers'], []);
      assert.strictEqual(answers['defaultBrowser'], '');
      assert.strictEqual(answers['cloudProvider'], 'browserstack');
      assert.strictEqual(answers['remoteName'], 'browserstack');
      assert.strictEqual(answers['remoteEnv'].username, 'BROWSERSTACK_USERNAME');
      assert.strictEqual(answers['remoteEnv'].access_key, 'BROWSERSTACK_ACCESS_KEY');
      assert.strictEqual(answers['testsLocation'], 'tests');
      assert.strictEqual(answers['addExamples'], true);
      assert.strictEqual(answers['examplesLocation'], 'nightwatch');
      assert.strictEqual(answers['baseUrl'], '');
    });

    it('when component testing is not selected', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {};
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('plugins' in answers, false);
      assert.strictEqual('uiFramework' in answers, false);
    });

    it('when react is selected as uiFramework', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        uiFramework: 'react'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('plugins' in answers, true);
      assert.strictEqual('uiFramework' in answers, true);
      assert.deepEqual(answers['plugins'], ['@nightwatch/react']);
      assert.strictEqual(answers['uiFramework'], 'react');
    });

    it('when vue is selected as uiFramework', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        uiFramework: 'vue'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('plugins' in answers, true);
      assert.strictEqual('uiFramework' in answers, true);
      assert.deepEqual(answers['plugins'], ['@nightwatch/vue']);
      assert.strictEqual(answers['uiFramework'], 'vue');
    });

    it('when storybook is selected as uiFramework', function() {
      mockery.registerMock('node:fs', {
        existsSync: () => false
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      let answers = {
        uiFramework: 'storybook'
      };
      nightwatchInit.refineAnswers(answers);
      assert.strictEqual('plugins' in answers, true);
      assert.strictEqual('uiFramework' in answers, true);
      assert.deepEqual(answers['plugins'], ['@nightwatch/storybook']);
      assert.strictEqual(answers['uiFramework'], 'storybook');
    });
  });

  describe('test identifyPackagesToInstall', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('correct packages are installed with ts-mocha-seleniumServer-mobile', function() {
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
        testingType: ['e2e'],
        language: 'ts',
        runner: 'mocha',
        backend: 'local',
        seleniumServer: true,
        mobile: true
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      const packagesToInstall = nightwatchInit.identifyPackagesToInstall(answers);

      assert.strictEqual(packagesToInstall.length, 5);
      assert.strictEqual(packagesToInstall.includes('nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('@types/nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('ts-node'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/selenium-server'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/mobile-helper'), true);
    });

    it('correct packages are installed with js-cucumber-plugins-mobile-app with backend remote', function() {
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
        testingType: ['component', 'app'],
        language: 'js',
        runner: 'cucumber',
        backend: 'remote',
        plugins: ['@nightwatch/react', '@nightwatch/storybook'],
        mobile: true
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      const packagesToInstall = nightwatchInit.identifyPackagesToInstall(answers);

      assert.strictEqual(packagesToInstall.length, 3);
      // App and mobile related packages not installed
      assert.strictEqual(packagesToInstall.includes('@cucumber/cucumber'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/react'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/storybook'), true);
    });

    it('correct packages are installed with js,app-testing in backend both and @nightwatch/mobile-helper always updated', function() {
      mockery.registerMock('node:fs', {
        readFileSync() {
          return `{
            "devDependencies": {
              "@nightwatch/mobile-helper": ""
            }
          }`;
        }
      });

      const answers = {
        testingType: ['e2e', 'app'],
        language: 'js',
        runner: 'nightwatch',
        backend: 'both'
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      const packagesToInstall = nightwatchInit.identifyPackagesToInstall(answers);

      assert.strictEqual(packagesToInstall.length, 3);
      assert.strictEqual(packagesToInstall.includes('nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('appium'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/mobile-helper'), true);
    });

    it('correct packages are installed with ts-cucumber-seleniumServer without initial packages', function() {
      mockery.registerMock('node:fs', {
        readFileSync(path, encoding) {
          return '{}';
        }
      });

      const answers = {
        testingType: ['e2e'],
        language: 'ts',
        runner: 'cucumber',
        backend: 'local',
        seleniumServer: true
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      const packagesToInstall = nightwatchInit.identifyPackagesToInstall(answers);

      assert.strictEqual(packagesToInstall.length, 6);
      assert.strictEqual(packagesToInstall.includes('nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('typescript'), true);
      assert.strictEqual(packagesToInstall.includes('@types/nightwatch'), true);
      assert.strictEqual(packagesToInstall.includes('ts-node'), true);
      assert.strictEqual(packagesToInstall.includes('@cucumber/cucumber'), true);
      assert.strictEqual(packagesToInstall.includes('@nightwatch/selenium-server'), true);
    });
  });

  describe('test installPackages', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('packages are installed correctly with correct output', function() {
      const consoleOutput = [];
      mockLogger(consoleOutput);

      const commandsExecuted = [];
      mockery.registerMock('child_process', {
        execSync(command, options) {
          commandsExecuted.push(command);
        }
      });

      const packagesToInstall = ['nightwatch', '@types/nightwatch', '@nightwatch/selenium-server', '@nightwatch/mobile-helper'];

      const {installPackages} = require('@nightwatch/setup-tools/dist/common.js');
      installPackages(packagesToInstall, rootDir);

      // Check the commands executed
      assert.strictEqual(commandsExecuted.length, 4);
      assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
      assert.strictEqual(commandsExecuted[1], 'npm install @types/nightwatch --save-dev');
      assert.strictEqual(commandsExecuted[2], 'npm install @nightwatch/selenium-server --save-dev');
      assert.strictEqual(commandsExecuted[3], 'npm install @nightwatch/mobile-helper --save-dev');

      const output = consoleOutput.toString();
      // 3 packages are installed
      assert.strictEqual((output.match(/- /g) || []).length, 4);
      assert.strictEqual((output.match(/Installing/g) || []).length, 5);
      assert.strictEqual((output.match(/Done!/g) || []).length, 4);
      // Check the packages installed
      assert.strictEqual(output.includes('nightwatch'), true);
      assert.strictEqual(output.includes('@types/nightwatch'), true);
      assert.strictEqual(output.includes('@nightwatch/selenium-server'), true);
      assert.strictEqual(output.includes('@nightwatch/mobile-helper'), true);
    });
  });

  describe('test setupTypesript', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('with both tsconfig not present', function() {
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(commandsExecuted.length, 1);
      assert.strictEqual(commandsExecuted[0], 'npx tsc --init');

      assert.strictEqual(nwTsconfigCopied, true);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
    });

    it('with both tsconfig already present', function() {
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(commandsExecuted.length, 0);
      assert.strictEqual(nwTsconfigCopied, false);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
    });

    it('with tsconfig.nightwatch.json already present', function() {
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.setupTypescript();

      assert.strictEqual(commandsExecuted.length, 1);
      assert.strictEqual(commandsExecuted[0], 'npx tsc --init');

      assert.strictEqual(nwTsconfigCopied, false);
      assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
    });
  });

  describe('test setupComponentTesting', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('generates index file for react', function() {
      let newFolderPath = '';
      let reactIndexCopied = false;
      let reactIndexDestPath = '';

      mockery.registerMock('node:fs', {
        mkdirSync(path) {
          newFolderPath = path;
        },
        copyFileSync(src, dest) {
          reactIndexCopied = true;
          reactIndexDestPath = dest;
        }
      });

      const answers = {
        uiFramework: 'react'
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.setupComponentTesting(answers);

      assert.strictEqual(newFolderPath, path.join(rootDir, 'nightwatch'));
      assert.strictEqual(reactIndexCopied, true);
      assert.strictEqual(reactIndexDestPath, path.join(newFolderPath, 'index.jsx'));
    });
  });

  describe('test getConfigDestPath', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('if config file is not already present', async function() {
      const consoleOutput = [];
      mockLogger(consoleOutput);

      mockery.registerMock('node:fs', {
        existsSync(path) {
          return false;
        },
        readFileSync() {
          return '{}';
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      const configExpPath = path.join(rootDir, 'nightwatch.conf.js');

      assert.strictEqual(configDestPath, configExpPath);
      assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);
      assert.strictEqual(nightwatchInit.otherInfo.usingESM, false);
    });

    it('if config file is already present and overwrite in prompt', async function() {
      const consoleOutput = [];
      mockLogger(consoleOutput);

      mockery.registerMock('node:fs', {
        existsSync(path) {
          return true;
        },
        readFileSync() {
          return '{}';
        }
      });

      mockery.registerMock('inquirer', {
        async prompt() {
          return {overwrite: true};
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      const configExpPath = path.join(rootDir, 'nightwatch.conf.js');

      assert.strictEqual(configDestPath, configExpPath);
      assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);
      assert.strictEqual(nightwatchInit.otherInfo.usingESM, false);
    });

    it('if config file is already present and new file in prompt', async function() {
      const consoleOutput = [];
      mockLogger(consoleOutput);

      mockery.registerMock('node:fs', {
        existsSync(path) {
          return true;
        },
        readFileSync() {
          return '{}';
        }
      });

      const configFileNameInitials = 'new-config';
      mockery.registerMock('inquirer', {
        async prompt() {
          return {overwrite: false, newFileName: configFileNameInitials};
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      const configFileName = `${configFileNameInitials}.conf.js`;
      const configExpPath = path.join(rootDir, configFileName);

      assert.strictEqual(configDestPath, configExpPath);
      assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, configFileName);
      assert.strictEqual(nightwatchInit.otherInfo.usingESM, false);
    });

    it('if config file is not already present (ESM)', async function() {
      const consoleOutput = [];
      mockLogger(consoleOutput);

      mockery.registerMock('node:fs', {
        existsSync(path) {
          return false;
        },
        readFileSync() {
          return '{"type": "module"}';
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      const configExpPath = path.join(rootDir, 'nightwatch.conf.cjs');

      assert.strictEqual(configDestPath, configExpPath);
      assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);
      assert.strictEqual(nightwatchInit.otherInfo.usingESM, true);
    });

    it('if config file is already present and new file in prompt (ESM)', async function() {
      const consoleOutput = [];
      mockLogger(consoleOutput);

      mockery.registerMock('node:fs', {
        existsSync(path) {
          return true;
        },
        readFileSync() {
          return '{"type": "module"}';
        }
      });

      const configFileNameInitials = 'new-config';
      let answersPassedToInquirer;
      mockery.registerMock('inquirer', {
        async prompt(questions, answers) {
          answersPassedToInquirer = answers;

          return {overwrite: false, newFileName: configFileNameInitials};
        }
      });

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);
      const configDestPath = await nightwatchInit.getConfigDestPath();

      assert.deepStrictEqual(answersPassedToInquirer, {rootDir: rootDir, configExt: '.conf.cjs'});

      const configFileName = `${configFileNameInitials}.conf.cjs`;
      const configExpPath = path.join(rootDir, configFileName);

      assert.strictEqual(configDestPath, configExpPath);
      assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, configFileName);
      assert.strictEqual(nightwatchInit.otherInfo.usingESM, true);
    });
  });

  describe('test generateConfig', function() {
    beforeEach(function() {
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(function() {
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    it('generateConfig with js and without testsLocation and examplesLocation', function() {
      mockLogger([]);

      const answers = {
        testingType: ['e2e'],
        language: 'js',
        backend: 'local',
        browsers: ['chrome', 'firefox'],
        mobileBrowsers: [],
        defaultBrowser: 'firefox',
        allowAnonymousMetrics: false,
        plugins: ['@nightwatch/react']
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, undefined);
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);

      assert.deepEqual(config.src_folders, []);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(config.plugins, ['@nightwatch/react']);
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'firefox', 'chrome']);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');

      fs.unlinkSync('test_config.conf.js');
    });

    it('generateConfig with js (local with mobile and app) and same testsLocation and examplesLocation', function() {
      mockLogger([]);

      const answers = {
        testingType: ['e2e', 'app'],
        language: 'js',
        backend: 'local',
        browsers: ['chrome', 'firefox'],
        mobileBrowsers: ['chrome', 'firefox'],
        mobilePlatform: 'android',
        defaultBrowser: 'firefox',
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'tests',
        allowAnonymousMetrics: false,
        mobile: true
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'tests');

      assert.deepEqual(config.src_folders, ['tests/examples']);
      assert.deepEqual(config.page_objects_path, ['tests/page-objects']);
      assert.deepEqual(config.custom_commands_path, ['tests/custom-commands']);
      assert.deepEqual(config.custom_assertions_path, ['tests/custom-assertions']);
      assert.deepEqual(config.plugins, []);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'firefox',
        'chrome',
        'android.real.firefox',
        'android.emulator.firefox',
        'android.real.chrome',
        'android.emulator.chrome',
        'app',
        'app.android.emulator',
        'app.android.real'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');

      fs.unlinkSync('test_config.conf.js');
    });

    it('generateConfig with js (local with mobile) with mobile flag', function() {
      mockLogger([]);

      const answers = {
        testingType: ['e2e'],
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'tests');

      assert.deepEqual(config.src_folders, ['tests/examples']);
      assert.deepEqual(config.page_objects_path, ['tests/page-objects']);
      assert.deepEqual(config.custom_commands_path, ['tests/custom-commands']);
      assert.deepEqual(config.custom_assertions_path, ['tests/custom-assertions']);
      assert.deepEqual(config.plugins, []);
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
      assert.strictEqual(config.test_settings['android.real.chrome'].webdriver.server_path, '');
      if (process.platform === 'win32') {
        assert.strictEqual(config.test_settings['android.emulator.chrome'].webdriver.server_path, 'chromedriver-mobile/chromedriver.exe');
      } else {
        assert.strictEqual(config.test_settings['android.emulator.chrome'].webdriver.server_path, 'chromedriver-mobile/chromedriver');
      }

      fs.unlinkSync('test_config.conf.js');
    });

    it('generateConfig with js with different testsLocation and examplesLocation', function() {
      mockLogger([]);

      const answers = {
        testingType: ['e2e'],
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('tests', 'nightwatch-examples'));

      assert.deepEqual(config.src_folders, ['tests', 'tests/nightwatch-examples/examples']);
      assert.deepEqual(config.page_objects_path, ['tests/nightwatch-examples/page-objects']);
      assert.deepEqual(config.custom_commands_path, ['tests/nightwatch-examples/custom-commands']);
      assert.deepEqual(config.custom_assertions_path, ['tests/nightwatch-examples/custom-assertions']);
      assert.deepEqual(config.plugins, []);
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

    it('generateConfig with js with cucumber and same testsLocation and examplesLocation', function() {
      mockLogger([]);

      const answers = {
        testingType: ['e2e'],
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);

      assert.deepEqual(config.src_folders, ['tests']);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(config.plugins, []);
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

    it('generateConfig with js with cucumber (both and mobile with mobile flag) and different testsLocation and examplesLocation', function() {
      mockLogger([]);

      // can be converted to sauce once we have sauce mobile configs
      const answers = {
        testingType: ['e2e'],
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);

      assert.deepEqual(config.src_folders, ['tests']);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(config.plugins, []);
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

    it('generateConfig with ts (remote with mobile) with testsLocation and examplesLocation', function() {
      mockLogger([]);

      const answers = {
        testingType: ['e2e'],
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

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);
      nightwatchInit.otherInfo.tsOutDir = 'dist';

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, path.join('dist', 'tests'));
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('dist', 'nightwatch-examples'));

      assert.deepEqual(config.src_folders, ['dist/tests', 'dist/nightwatch-examples']);
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(config.plugins, []);
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

    it('generateConfig with js and app testing with allowAnonymousMetrics set to false', function() {
      mockLogger([]);

      mockery.registerMock(
        'uuid',

        class {
          static v4() {
            return '3141-5926-5358-9793';
          }
        }
      );

      const answers = {
        testingType: ['app'],
        language: 'js',
        backend: 'local',
        browsers: [],
        mobileBrowsers: [],
        mobilePlatform: 'both',
        defaultBrowser: '',
        testsLocation: 'tests',
        addExamples: true,
        examplesLocation: 'nightwatch',
        allowAnonymousMetrics: false
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);

      assert.strictEqual(nightwatchInit.client_id, '3141-5926-5358-9793');

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(typeof config.usage_analytics, 'undefined');
      assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
      assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch');

      assert.deepEqual(config.src_folders, ['tests', 'nightwatch/examples']);
      // only set for web testing
      assert.deepEqual(config.page_objects_path, []);
      assert.deepEqual(config.custom_commands_path, []);
      assert.deepEqual(config.custom_assertions_path, []);
      assert.deepEqual(config.plugins, []);
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'app',
        'app.android.emulator',
        'app.android.real',
        'app.ios.simulator',
        'app.ios.real'
      ]);
      assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, '');
      assert.strictEqual(config.test_settings.app.selenium.start_process, true);
      assert.strictEqual(config.test_settings.app.selenium.use_appium, true);

      fs.unlinkSync('test_config.conf.js');
    });

    it('generateConfig with js with allowAnonymousMetrics set to true', function() {
      mockLogger([]);

      const answers = {
        testingType: ['e2e'],
        language: 'js',
        backend: 'local',
        browsers: ['chrome', 'firefox'],
        mobileBrowsers: [],
        defaultBrowser: 'firefox',
        allowAnonymousMetrics: true
      };

      const {NightwatchInitiator} = require('@nightwatch/setup-tools');
      const nightwatchInit = new NightwatchInitiator(rootDir, []);
      nightwatchInit.otherInfo.tsOutDir = 'dist';

      nightwatchInit.generateConfig(answers, 'test_config.conf.js');
      const config = require('../../test_config.conf.js');

      assert.strictEqual(config.usage_analytics.enabled, true);

      fs.unlinkSync('test_config.conf.js');
    });
  });
});

describe('test identifyWebdriversToInstall', function() {
  beforeEach(function() {
    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
  });

  afterEach(function() {
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
  });

  it('selects correct webdrivers with firefox,chrome,safari browsers', function() {
    const answers = {
      testingType: ['e2e'],
      browsers: ['chrome', 'firefox', 'safari']
    };

    const {NightwatchInitiator} = require('@nightwatch/setup-tools');
    const nightwatchInit = new NightwatchInitiator(rootDir, []);

    const webdriversToInstall = nightwatchInit.identifyWebdriversToInstall(answers);

    assert.strictEqual(webdriversToInstall.length, 3);
    assert.strictEqual(webdriversToInstall.includes('geckodriver'), true);
    assert.strictEqual(webdriversToInstall.includes('chromedriver'), true);
    assert.strictEqual(webdriversToInstall.includes('safaridriver'), true);
  });

  it('selects correct webdrivers with firefox,chrome mobileBrowser and safari browsers', function() {
    const answers = {
      testingType: ['e2e'],
      browsers: ['safari'],
      mobileBrowsers: ['chrome', 'firefox']
    };

    const {NightwatchInitiator} = require('@nightwatch/setup-tools');
    const nightwatchInit = new NightwatchInitiator(rootDir, []);

    const webdriversToInstall = nightwatchInit.identifyWebdriversToInstall(answers);

    assert.strictEqual(webdriversToInstall.length, 3);
    assert.strictEqual(webdriversToInstall.includes('geckodriver'), true);
    assert.strictEqual(webdriversToInstall.includes('chromedriver'), true);
    assert.strictEqual(webdriversToInstall.includes('safaridriver'), true);
  });

  it('selects correct webdrivers with firefox browser and app testing on android', function() {
    const answers = {
      testingType: ['e2e', 'app'],
      browsers: ['firefox'],
      mobilePlatform: 'android'
    };

    const {NightwatchInitiator} = require('@nightwatch/setup-tools');
    const nightwatchInit = new NightwatchInitiator(rootDir, []);

    const webdriversToInstall = nightwatchInit.identifyWebdriversToInstall(answers);

    assert.strictEqual(webdriversToInstall.length, 2);
    assert.strictEqual(webdriversToInstall.includes('geckodriver'), true);
    assert.strictEqual(webdriversToInstall.includes('chromedriver'), true);
  });

  it('selects correct webdrivers with no browser and app testing on both', function() {
    const answers = {
      testingType: ['app'],
      mobilePlatform: 'both'
    };

    const {NightwatchInitiator} = require('@nightwatch/setup-tools');
    const nightwatchInit = new NightwatchInitiator(rootDir, []);

    const webdriversToInstall = nightwatchInit.identifyWebdriversToInstall(answers);

    assert.strictEqual(webdriversToInstall.length, 2);
    assert.strictEqual(webdriversToInstall.includes('chromedriver'), true);
    assert.strictEqual(webdriversToInstall.includes('safaridriver'), true);
  });

  it('selects correct webdrivers with chrome mobileBrowser and app testing on ios', function() {
    const answers = {
      testingType: ['component', 'app'],
      mobileBrowsers: ['chrome'],
      mobilePlatform: 'ios'
    };

    const {NightwatchInitiator} = require('@nightwatch/setup-tools');
    const nightwatchInit = new NightwatchInitiator(rootDir, []);

    const webdriversToInstall = nightwatchInit.identifyWebdriversToInstall(answers);

    assert.strictEqual(webdriversToInstall.length, 2);
    assert.strictEqual(webdriversToInstall.includes('chromedriver'), true);
    assert.strictEqual(webdriversToInstall.includes('safaridriver'), true);
  });

  it('selects correct webdrivers with safari mobileBrowser', function() {
    const answers = {
      testingType: ['component'],
      mobileBrowsers: ['safari']
    };

    const {NightwatchInitiator} = require('@nightwatch/setup-tools');
    const nightwatchInit = new NightwatchInitiator(rootDir, []);

    const webdriversToInstall = nightwatchInit.identifyWebdriversToInstall(answers);

    assert.strictEqual(webdriversToInstall.length, 1);
    assert.strictEqual(webdriversToInstall.includes('safaridriver'), true);
  });
  
  it('selects correct webdrivers with firefox browser and app testing on both and backend remote', function() {
    const answers = {
      backend: 'remote',
      browsers: ['firefox'],
      testingType: ['e2e', 'app'],
      mobilePlatform: 'both'
    };

    const {NightwatchInitiator} = require('@nightwatch/setup-tools');
    const nightwatchInit = new NightwatchInitiator(rootDir, []);

    const webdriversToInstall = nightwatchInit.identifyWebdriversToInstall(answers);

    assert.strictEqual(webdriversToInstall.length, 1);
    assert.strictEqual(webdriversToInstall.includes('geckodriver'), true);
  });
});
