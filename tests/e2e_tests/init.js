const assert = require('assert');
const mockery = require('mockery');
const fs = require('node:fs');
const path = require('path');
const {execSync} = require('child_process');
const {rmDirSync} = require('../../lib/utils');
const nock = require('nock');

const rootDir = path.join(process.cwd(), 'test_output');

describe('e2e tests for init', () => {
  before(() => {
    if (!nock.isActive()) {
      nock.activate();
    }
  });

  after(() => {
    nock.cleanAll();
    nock.restore();
  });

  beforeEach(() => {
    rmDirSync(rootDir);

    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});

    if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
      if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir, {recursive: true});
      }
      execSync('npm init -y', {
        stdio: 'pipe',
        cwd: rootDir
      });
    }
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
  });

  test('with js-nightwatch-local', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: true};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn
    });

    const answers = {
      language: 'js',
      runner: 'nightwatch',
      backend: 'local',
      browsers: ['chrome', 'edge', 'safari'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests',
      allowAnonymousMetrics: false
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, []);

    nightwatchInit.askQuestions = () => {
      return answers;
    };
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    if (process.platform === 'darwin') {
      assert.deepStrictEqual(answers.browsers, ['chrome', 'edge', 'safari']);
    } else {
      assert.deepStrictEqual(answers.browsers, ['chrome', 'edge']);
    }
    assert.strictEqual(answers.remoteBrowsers, undefined);
    assert.deepStrictEqual(answers.mobileBrowsers, []);
    assert.strictEqual(answers.mobileRemote, undefined);
    assert.strictEqual(answers.mobileDevice, undefined);
    assert.strictEqual(answers.cloudProvider, undefined);
    assert.strictEqual(answers.remoteName, undefined);
    assert.strictEqual(answers.remoteEnv, undefined);
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.testsLocation, 'tests');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests', 'nightwatch/examples']);
    assert.deepEqual(config.page_objects_path, ['nightwatch/page-objects']);
    assert.deepEqual(config.custom_commands_path, ['nightwatch/custom-commands']);
    assert.deepEqual(config.custom_assertions_path, ['nightwatch/custom-assertions']);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'safari',
        'chrome',
        'edge'
      ]);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'edge'
      ]);
    }

    // Test Packages and webdrivers installed
    if (process.platform === 'darwin') {
      assert.strictEqual(commandsExecuted.length, 3);
      assert.strictEqual(commandsExecuted[2], 'sudo safaridriver --enable');
    } else {
      assert.strictEqual(commandsExecuted.length, 2);
    }
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install chromedriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 5);
    assert.deepEqual(exampleFiles, ['custom-assertions', 'custom-commands', 'examples',  'page-objects', 'templates']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin') {assert.strictEqual(output.includes('Enabling safaridriver...'), true)}
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'nightwatch\'.'), true);
    assert.strictEqual(output.includes('Generating template files...'), true);
    assert.strictEqual(output.includes(`Success! Generated some templates files at '${path.join('nightwatch', 'templates')}'.`), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('Join our Discord community and instantly find answers to your issues or queries.'), true);
    assert.strictEqual(output.includes('Visit our GitHub page to report bugs or raise feature requests:'), true);
    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch', 'examples')}`),
      true
    );
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch', 'examples', 'basic', 'ecosia.js')}`),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), false);

    rmDirSync(rootDir);

  });

  test('with js-cucumber-remote', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: true};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn
    });

    const answers = {
      language: 'js',
      runner: 'cucumber',
      backend: 'remote',
      cloudProvider: 'other',
      browsers: ['chrome', 'edge'],
      testsLocation: 'tests',
      featurePath: path.join('tests', 'features'),
      baseUrl: 'https://nightwatchjs.org',
      allowAnonymousMetrics: false
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, []);

    nightwatchInit.askQuestions = () => {
      return answers;
    };
    const configPath = path.join(rootDir, 'nightwatch.conf.cjs');
    nightwatchInit.getConfigDestPath = () => {
      nightwatchInit.otherInfo.usingESM = true;

      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    assert.deepEqual(answers.browsers, undefined);
    assert.deepEqual(answers.remoteBrowsers, ['chrome', 'edge']);
    assert.deepStrictEqual(answers.mobileBrowsers, undefined);
    assert.strictEqual(answers.mobileRemote, undefined);
    assert.strictEqual(answers.mobileDevice, undefined);
    assert.strictEqual(answers.cloudProvider, 'other');
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.remoteEnv.username, 'REMOTE_USERNAME');
    assert.strictEqual(answers.remoteEnv.access_key, 'REMOTE_ACCESS_KEY');
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, path.join('tests', 'features', 'nightwatch'));

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, true);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.deepEqual(config.custom_assertions_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.test_runner.type, 'cucumber');
    assert.strictEqual(config.test_settings.default.test_runner.options.feature_path, 'tests/features');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.remote.selenium.host, '<remote-hostname>');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
    assert.strictEqual(config.test_settings.remote.username, '${REMOTE_USERNAME}');
    assert.strictEqual(config.test_settings.remote.access_key, '${REMOTE_ACCESS_KEY}');
    assert.deepEqual(Object.keys(config.test_settings), ['default', 'remote', 'remote.chrome', 'remote.edge']);

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 2);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install @cucumber/cucumber --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 2);
    assert.deepEqual(exampleFiles, ['nightwatch.feature', 'step_definitions']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @cucumber/cucumber'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Generating example for CucumberJS...'), true);
    assert.strictEqual(
      output.includes(
        `Success! Generated an example for CucumberJS at "${path.join('tests', 'features', 'nightwatch')}"`
      ),
      true
    );
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('Join our Discord community and instantly find answers to your issues or queries.'), true);
    assert.strictEqual(output.includes('Visit our GitHub page to report bugs or raise feature requests:'), true);
    assert.strictEqual(output.includes('IMPORTANT'), true);
    assert.strictEqual(output.includes('To run tests on your remote device, please set the host and port property in your nightwatch.conf.cjs file.'), true);
    assert.strictEqual(output.includes('These can be located at:'), true);
    assert.strictEqual(output.includes('Please set the credentials (if any) required to run tests'), true);
    assert.strictEqual(output.includes('- REMOTE_USERNAME'), true);
    assert.strictEqual(output.includes('- REMOTE_ACCESS_KEY'), true);
    assert.strictEqual(output.includes('(.env files are also supported)'), true);
    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes('To run your tests with CucumberJS, simply run:'), true);
    assert.strictEqual(output.includes('npx nightwatch --env remote.chrome'), true);
    assert.strictEqual(output.includes('To run an example test with CucumberJS, run:'), true);
    assert.strictEqual(
      output.includes(`npx nightwatch ${path.join('tests', 'features', 'nightwatch')} --env remote.chrome`),
      true
    );
    assert.strictEqual(output.includes('For more details on using CucumberJS with Nightwatch, visit:'), true);
    assert.strictEqual(output.includes('Note: Microsoft Edge Webdriver is not installed automatically.'), false);

    rmDirSync(rootDir);

  });

  test('with js-mocha-both', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: false};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn
    });

    // Create a folder in the 'tests' folder, to make it non-empty.
    fs.mkdirSync(path.join(rootDir, 'tests', 'sample'), {recursive: true});

    const answers = {
      language: 'js',
      runner: 'mocha',
      backend: 'both',
      cloudProvider: 'browserstack',
      browsers: ['chrome', 'safari'],
      testsLocation: 'tests',
      baseUrl: 'https://nightwatchjs.org',
      allowAnonymousMetrics: false
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, []);

    nightwatchInit.askQuestions = () => {
      return answers;
    };
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    if (process.platform === 'darwin') {
      assert.deepEqual(answers.browsers, ['chrome', 'safari']);
    } else {
      assert.deepEqual(answers.browsers, ['chrome']);
    }
    assert.deepEqual(answers.remoteBrowsers, ['chrome', 'safari']);
    assert.deepStrictEqual(answers.mobileBrowsers, []);
    assert.strictEqual(answers.mobileRemote, undefined);
    assert.strictEqual(answers.mobileDevice, undefined);
    assert.strictEqual(answers.cloudProvider, 'browserstack');
    assert.strictEqual(answers.remoteName, 'browserstack');
    assert.strictEqual(answers.remoteEnv.username, 'BROWSERSTACK_USERNAME');
    assert.strictEqual(answers.remoteEnv.access_key, 'BROWSERSTACK_ACCESS_KEY');
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests', 'nightwatch/examples']);
    assert.deepEqual(config.page_objects_path, ['nightwatch/page-objects']);
    assert.deepEqual(config.custom_commands_path, ['nightwatch/custom-commands']);
    assert.deepEqual(config.custom_assertions_path, ['nightwatch/custom-assertions']);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.test_runner.type, 'mocha');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
    assert.strictEqual(config.test_settings.browserstack.selenium.port, 443);
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].userName, '${BROWSERSTACK_USERNAME}');
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].accessKey, '${BROWSERSTACK_ACCESS_KEY}');
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'safari',
        'chrome',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.safari',
        'browserstack.local_chrome'
      ]);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.safari',
        'browserstack.local_chrome'
      ]);
    }

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 2);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install chromedriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 5);
    assert.deepEqual(exampleFiles, ['custom-assertions', 'custom-commands', 'examples',  'page-objects', 'templates']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin') {
      assert.strictEqual(
        output.includes('Please run \'sudo safaridriver --enable\' command to enable safaridriver later.'),
        true
      );
    }
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'nightwatch\'.'), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('Join our Discord community and instantly find answers to your issues or queries.'), true);
    assert.strictEqual(output.includes('Visit our GitHub page to report bugs or raise feature requests:'), true);
    assert.strictEqual(output.includes('Please set the credentials required to run tests on your cloud provider'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_USERNAME'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_ACCESS_KEY'), true);
    assert.strictEqual(output.includes('(.env files are also supported)'), true);
    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch', 'examples')}`), true);
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch', 'examples', 'basic', 'ecosia.js')}`),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), false);

    rmDirSync(rootDir);

  });

  test('with ts-nightwatch-remote-mobile', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: true};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn
    });

    // Create an empty 'tests' folder in the rootDir.
    fs.mkdirSync(path.join(rootDir, 'tests'), {recursive: true});

    const answers = {
      language: 'ts',
      runner: 'nightwatch',
      backend: 'remote',
      cloudProvider: 'saucelabs',
      browsers: ['firefox'],
      remoteBrowsers: ['chrome', 'edge', 'safari'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests',
      allowAnonymousMetrics: false,
      mobile: true
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, []);

    nightwatchInit.askQuestions = () => {
      return answers;
    };
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    assert.deepEqual(answers.browsers, undefined);
    assert.deepEqual(answers.remoteBrowsers, ['chrome', 'edge', 'safari']);
    assert.deepStrictEqual(answers.mobileBrowsers, undefined);
    assert.strictEqual(answers.mobileRemote, true);
    assert.strictEqual(answers.mobileDevice, undefined);
    assert.strictEqual(answers.cloudProvider, 'saucelabs');
    assert.strictEqual(answers.remoteName, 'saucelabs');
    assert.strictEqual(answers.remoteEnv.username, 'SAUCE_USERNAME');
    assert.strictEqual(answers.remoteEnv.access_key, 'SAUCE_ACCESS_KEY');
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests', 'nightwatch']);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.deepEqual(config.custom_assertions_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.saucelabs.selenium.host, 'ondemand.saucelabs.com');
    assert.strictEqual(config.test_settings.saucelabs.selenium.port, 443);
    assert.strictEqual(config.test_settings.saucelabs.desiredCapabilities['sauce:options'].username, '${SAUCE_USERNAME}');
    assert.strictEqual(config.test_settings.saucelabs.desiredCapabilities['sauce:options'].accessKey, '${SAUCE_ACCESS_KEY}');
    assert.deepEqual(Object.keys(config.test_settings), [
      'default',
      'saucelabs',
      'saucelabs.chrome',
      'saucelabs.safari'
    ]);

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 6);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install typescript --save-dev');
    assert.strictEqual(commandsExecuted[2], 'npm install @types/nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[3], 'npm install ts-node --save-dev');
    assert.strictEqual(commandsExecuted[4], 'npm install @nightwatch/mobile-helper --save-dev');
    assert.strictEqual(commandsExecuted[5], 'npx tsc --init');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 5);
    assert.deepEqual(exampleFiles, ['duckDuckGo.ts', 'ecosia.ts', 'github.ts', 'google.ts', 'tsconfig.json']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing typescript'), true);
    assert.strictEqual(output.includes('Installing @types/nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/mobile-helper'), true);
    assert.strictEqual(
      output.includes(`Success! Configuration file generated at: "${path.join(rootDir, 'nightwatch.conf.js')}"`),
      true
    );
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(
      output.includes('Success! Generated some example files at \'nightwatch\'.'),
      true
    );
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('Join our Discord community and instantly find answers to your issues or queries.'), true);
    assert.strictEqual(output.includes('Visit our GitHub page to report bugs or raise feature requests:'), true);
    assert.strictEqual(output.includes('Please set the credentials required to run tests on your cloud provider'), true);
    assert.strictEqual(output.includes('- SAUCE_USERNAME'), true);
    assert.strictEqual(output.includes('- SAUCE_ACCESS_KEY'), true);
    assert.strictEqual(output.includes('(.env files are also supported)'), true);
    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch')} --env saucelabs.chrome`), true);
    assert.strictEqual(
      output.includes(
        `npx nightwatch .${path.sep}${path.join('nightwatch', 'github.ts')} --env saucelabs.chrome`
      ),
      true
    );
    assert.strictEqual(output.includes('Note: Microsoft Edge Webdriver is not installed automatically.'), false);

    rmDirSync(rootDir);

  });

  test('with ts-mocha-both-browserstack-mobile and non-default config', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: false};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn,
      gray: {
        italic: colorFn
      }
    });

    let androidSetupOptionsPassed;
    let androidSetupRootDirPassed;
    mockery.registerMock('@nightwatch/mobile-helper', {
      AndroidSetup: class {
        constructor(options, rootDir) {
          androidSetupOptionsPassed = options;
          androidSetupRootDirPassed = rootDir;
        }
        run() {
          return {
            status: true,
            mode: 'both'
          };
        }
      },
      IosSetup: class {
        constructor() {}
        run() {
          return {
            real: true,
            simulator: true
          };
        }
      }
    });

    // Create a non-empty 'tests' folder as well as a non-empty
    // 'nightwatch' folder in the rootDir.
    fs.mkdirSync(path.join(rootDir, 'tests', 'sample'), {recursive: true});
    fs.mkdirSync(path.join(rootDir, 'nightwatch', 'sample'), {recursive: true});

    const answers = {
      language: 'ts',
      runner: 'mocha',
      backend: 'both',
      cloudProvider: 'browserstack',
      browsers: ['firefox', 'safari'],
      remoteBrowsers: ['chrome'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests',
      allowAnonymousMetrics: false,
      mobile: true
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, []);

    nightwatchInit.askQuestions = () => {
      return answers;
    };

    const configFileName = 'new-config.conf.js';
    const configPath = path.join(rootDir, configFileName);
    nightwatchInit.getConfigDestPath = () => {
      nightwatchInit.otherInfo.nonDefaultConfigName = configFileName;

      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    let browsers;
    if (process.platform === 'darwin') {
      browsers = ['firefox', 'safari'];
      assert.strictEqual(answers.mobileDevice, 'both');
    } else {
      browsers = ['firefox'];
      assert.strictEqual(answers.mobileDevice, 'android');
    }
    assert.deepStrictEqual(answers.browsers, browsers);
    assert.deepStrictEqual(answers.mobileBrowsers, browsers);
    assert.deepStrictEqual(answers.remoteBrowsers, ['chrome']);
    assert.strictEqual(answers.mobileRemote, true);
    assert.strictEqual(answers.cloudProvider, 'browserstack');
    assert.strictEqual(answers.remoteName, 'browserstack');
    assert.strictEqual(answers.remoteEnv.username, 'BROWSERSTACK_USERNAME');
    assert.strictEqual(answers.remoteEnv.access_key, 'BROWSERSTACK_ACCESS_KEY');
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch');

    // Test info passed
    assert.deepStrictEqual(androidSetupOptionsPassed, {browsers: browsers});
    assert.strictEqual(androidSetupRootDirPassed, rootDir);

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, '');
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, configFileName);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests', 'nightwatch']);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.deepEqual(config.custom_assertions_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
    assert.strictEqual(config.test_settings.browserstack.selenium.port, 443);
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].userName, '${BROWSERSTACK_USERNAME}');
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].accessKey, '${BROWSERSTACK_ACCESS_KEY}');
    if (process.platform === 'darwin') {
      assert.deepStrictEqual(Object.keys(config.test_settings), [
        'default',
        'safari',
        'firefox',
        'android.real.firefox',
        'android.emulator.firefox',
        'ios.real.safari',
        'ios.simulator.safari',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.local_chrome',
        'browserstack.android.chrome',
        'browserstack.ios.safari'
      ]);
    } else {
      assert.deepStrictEqual(Object.keys(config.test_settings), [
        'default',
        'firefox',
        'android.real.firefox',
        'android.emulator.firefox',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.local_chrome',
        'browserstack.android.chrome',
        'browserstack.ios.safari'
      ]);
    }

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 7);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install typescript --save-dev');
    assert.strictEqual(commandsExecuted[2], 'npm install @types/nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[3], 'npm install ts-node --save-dev');
    assert.strictEqual(commandsExecuted[4], 'npm install @nightwatch/mobile-helper --save-dev');
    assert.strictEqual(commandsExecuted[5], 'npx tsc --init');
    assert.strictEqual(commandsExecuted[6], 'npm install geckodriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    // examples not copied
    assert.strictEqual(exampleFiles.length, 2);
    assert.deepEqual(exampleFiles, ['sample', 'tsconfig.json']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing typescript'), true);
    assert.strictEqual(output.includes('Installing @types/nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/mobile-helper'), true);
    assert.strictEqual(
      output.includes(`Success! Configuration file generated at: "${path.join(rootDir, configFileName)}"`),
      true
    );
    assert.strictEqual(output.includes('To use this configuration file, run the tests using --config flag.'), true);
    assert.strictEqual(output.includes('Installing webdriver for Firefox (geckodriver)...'), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(
      output.includes('Examples already exists at \'nightwatch\'. Skipping...'),
      true
    );
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('Join our Discord community and instantly find answers to your issues or queries.'), true);
    assert.strictEqual(output.includes('Visit our GitHub page to report bugs or raise feature requests:'), true);
    assert.strictEqual(output.includes('Please set the credentials required to run tests on your cloud provider'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_USERNAME'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_ACCESS_KEY'), true);
    assert.strictEqual(output.includes('(.env files are also supported)'), true);
    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch')} --config new-config.conf.js`), true);
    assert.strictEqual(
      output.includes(
        `npx nightwatch .${path.sep}${path.join(
          'nightwatch',
          'github.ts'
        )} --config new-config.conf.js`
      ),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), false);

    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS ON MOBILE'), true);
    assert.strictEqual(output.includes('To run an example test on Real Android device'), true);
    assert.strictEqual(output.includes('* Make sure your device is connected'), true);
    assert.strictEqual(output.includes('* Make sure required browsers are installed.'), true);
    assert.strictEqual(output.includes('github.ts --config new-config.conf.js --env android.real.firefox'), true);
    assert.strictEqual(output.includes('github.ts --config new-config.conf.js --env android.real.chrome'), false);
    assert.strictEqual(output.includes('To run an example test on Android Emulator, run:'), true);
    assert.strictEqual(output.includes('github.ts --config new-config.conf.js --env android.emulator.firefox'), true);
    assert.strictEqual(output.includes('github.ts --config new-config.conf.js --env android.emulator.chrome'), false);
    if (process.platform === 'darwin') {
      assert.strictEqual(output.includes('To run an example test on real iOS device, run:'), true);
      assert.strictEqual(output.includes('To run an example test on iOS simulator, run:'), true);
      assert.strictEqual(output.includes('github.ts --config new-config.conf.js --env ios.real.safari'), true);
      assert.strictEqual(output.includes('github.ts --config new-config.conf.js --env ios.simulator.safari'), true);
    }

    rmDirSync(rootDir);

  });

  test('with yes and browser flag', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: true};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn
    });

    const answers = require('../../lib/defaults.json');
    mockery.registerMock('./defaults.json', answers);

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, {
      'generate-config': false,
      yes: true,
      browser: ['firefox', 'chrome']
    });

    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    assert.deepEqual(answers.browsers, ['firefox', 'chrome']);
    assert.deepEqual(answers.remoteBrowsers, ['firefox', 'chrome']);
    assert.deepStrictEqual(answers.mobileBrowsers, []);
    assert.strictEqual(answers.mobileRemote, undefined);
    assert.strictEqual(answers.mobileDevice, undefined);
    assert.strictEqual(answers.cloudProvider, 'browserstack');
    assert.strictEqual(answers.remoteName, 'browserstack');
    assert.strictEqual(answers.remoteEnv.username, 'BROWSERSTACK_USERNAME');
    assert.strictEqual(answers.remoteEnv.access_key, 'BROWSERSTACK_ACCESS_KEY');
    assert.strictEqual(answers.seleniumServer, true);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.testsLocation, 'nightwatch-e2e');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'nightwatch-e2e');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['nightwatch-e2e', 'nightwatch/examples']);
    assert.deepEqual(config.page_objects_path, ['nightwatch/page-objects']);
    assert.deepEqual(config.custom_commands_path, ['nightwatch/custom-commands']);
    assert.deepEqual(config.custom_assertions_path, ['nightwatch/custom-assertions']);
    assert.strictEqual(config.test_settings.default.launch_url, 'http://localhost');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
    assert.strictEqual(config.test_settings.browserstack.selenium.port, 443);
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].userName, '${BROWSERSTACK_USERNAME}');
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].accessKey, '${BROWSERSTACK_ACCESS_KEY}');
    assert.deepEqual(Object.keys(config.test_settings), [
      'default',
      'firefox',
      'chrome',
      'browserstack',
      'browserstack.local',
      'browserstack.chrome',
      'browserstack.firefox',
      'browserstack.local_chrome',
      'browserstack.local_firefox',
      'selenium_server',
      'selenium.chrome',
      'selenium.firefox'
    ]);

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 5);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install @nightwatch/selenium-server --save-dev');
    assert.strictEqual(commandsExecuted[2], 'java -version');
    assert.strictEqual(commandsExecuted[3], 'npm install geckodriver --save-dev');
    assert.strictEqual(commandsExecuted[4], 'npm install chromedriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 5);
    assert.deepEqual(exampleFiles, ['custom-assertions', 'custom-commands', 'examples',  'page-objects', 'templates']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Firefox (geckodriver)...'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'nightwatch\'.'), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('Join our Discord community and instantly find answers to your issues or queries.'), true);
    assert.strictEqual(output.includes('Visit our GitHub page to report bugs or raise feature requests:'), true);
    assert.strictEqual(output.includes('Please set the credentials required to run tests on your cloud provider'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_USERNAME'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_ACCESS_KEY'), true);
    assert.strictEqual(output.includes('(.env files are also supported)'), true);
    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch', 'examples')}`), true);
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch', 'examples', 'basic', 'ecosia.js')}`),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(output.includes('To run tests on your local selenium-server, use command:'), true);
    assert.strictEqual(output.includes('npx nightwatch --env selenium_server'), true);

    rmDirSync(rootDir);
  });

  test('with yes, browser and mobile flag', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: true};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn,
      gray: {
        italic: colorFn
      }
    });

    mockery.registerMock('@nightwatch/mobile-helper', {
      AndroidSetup: class {
        constructor() {}
        run() {
          return {
            status: false,
            setup: true
          };
        }
      },
      IosSetup: class {
        constructor() {}
        run() {
          return {
            real: true,
            simulator: false
          };
        }
      }
    });

    const answers = require('../../lib/defaultsMobile.json');
    mockery.registerMock('./defaultsMobile.json', answers);

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, {
      'generate-config': false,
      yes: true,
      browser: ['firefox', 'chrome', 'safari'],
      mobile: true
    });

    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    let mobileBrowsers;
    if (process.platform === 'darwin') {
      mobileBrowsers = ['firefox', 'chrome', 'safari'];
      assert.strictEqual(answers.mobileDevice, 'both');
    } else {
      mobileBrowsers = ['firefox', 'chrome'];
      assert.strictEqual(answers.mobileDevice, 'android');
    }
    assert.deepStrictEqual(answers.browsers, []);
    assert.deepStrictEqual(answers.mobileBrowsers, mobileBrowsers);
    assert.deepEqual(answers.remoteBrowsers, []);
    assert.strictEqual(answers.mobileRemote, true);
    assert.strictEqual(answers.cloudProvider, 'browserstack');
    assert.strictEqual(answers.remoteName, 'browserstack');
    assert.strictEqual(answers.remoteEnv.username, 'BROWSERSTACK_USERNAME');
    assert.strictEqual(answers.remoteEnv.access_key, 'BROWSERSTACK_ACCESS_KEY');
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.testsLocation, 'nightwatch-e2e');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'nightwatch-e2e');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['nightwatch-e2e', 'nightwatch/examples']);
    assert.deepEqual(config.page_objects_path, ['nightwatch/page-objects']);
    assert.deepEqual(config.custom_commands_path, ['nightwatch/custom-commands']);
    assert.deepEqual(config.custom_assertions_path, ['nightwatch/custom-assertions']);
    assert.strictEqual(config.test_settings.default.launch_url, 'http://localhost');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
    assert.strictEqual(config.test_settings.browserstack.selenium.port, 443);
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].userName, '${BROWSERSTACK_USERNAME}');
    assert.strictEqual(config.test_settings.browserstack.desiredCapabilities['bstack:options'].accessKey, '${BROWSERSTACK_ACCESS_KEY}');
    if (process.platform === 'darwin') {
      assert.deepStrictEqual(Object.keys(config.test_settings), [
        'default',
        'android.real.firefox',
        'android.emulator.firefox',
        'android.real.chrome',
        'android.emulator.chrome',
        'ios.real.safari',
        'ios.simulator.safari',
        'browserstack',
        'browserstack.local',
        'browserstack.android.chrome',
        'browserstack.ios.safari'
      ]);
    } else {
      assert.deepStrictEqual(Object.keys(config.test_settings), [
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
    }

    // Test Packages and webdrivers installed
    if (process.platform === 'darwin') {
      assert.strictEqual(commandsExecuted.length, 5);
      assert.strictEqual(commandsExecuted[4], 'sudo safaridriver --enable');
    } else {
      assert.strictEqual(commandsExecuted.length, 4);
    }
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install @nightwatch/mobile-helper --save-dev');
    assert.strictEqual(commandsExecuted[2], 'npm install geckodriver --save-dev');
    assert.strictEqual(commandsExecuted[3], 'npm install chromedriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 5);
    assert.deepEqual(exampleFiles, ['custom-assertions', 'custom-commands', 'examples',  'page-objects', 'templates']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/mobile-helper'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Firefox (geckodriver)...'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin') {assert.strictEqual(output.includes('Enabling safaridriver...'), true)}
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'nightwatch\'.'), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('Join our Discord community and instantly find answers to your issues or queries.'), true);
    assert.strictEqual(output.includes('Visit our GitHub page to report bugs or raise feature requests:'), true);
    assert.strictEqual(output.includes('Please set the credentials required to run tests on your cloud provider'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_USERNAME'), true);
    assert.strictEqual(output.includes('- BROWSERSTACK_ACCESS_KEY'), true);
    assert.strictEqual(output.includes('(.env files are also supported)'), true);
    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS\n'), false);

    assert.strictEqual(output.includes('RUN NIGHTWATCH TESTS ON MOBILE'), true);
    assert.strictEqual(output.includes('Android setup failed...'), true);
    assert.strictEqual(output.includes('Please go through the setup logs above'), true);
    assert.strictEqual(output.includes('To setup Android, run:'), true);
    assert.strictEqual(output.includes('For Android help, run:'), true);
    assert.strictEqual(output.includes('Once setup is complete...'), true);
    assert.strictEqual(output.includes('To run an example test on Real Android device'), true);
    assert.strictEqual(output.includes('To run an example test on Android Emulator, run:'), true);
    if (process.platform === 'darwin') {
      assert.strictEqual(output.includes('To run an example test on real iOS device, run:'), true);
      assert.strictEqual(output.includes('ecosia.js --env ios.real.safari'), true);
      assert.strictEqual(output.includes('iOS setup incomplete...'), true);
      assert.strictEqual(output.includes('Please follow the guide above'), true);
      assert.strictEqual(output.includes('For iOS setup, run:'), true);
      assert.strictEqual(output.includes('For iOS help, run:'), true);
      assert.strictEqual(output.includes('After completing the setup...'), true);
      assert.strictEqual(output.includes('To run an example test on real iOS device, run:'), true);
      assert.strictEqual(output.includes('To run an example test on iOS simulator, run:'), true);
    }

    rmDirSync(rootDir);
  });

  test('generate-config with js-nightwatch-local and seleniumServer false', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: true};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn
    });

    const answers = {
      language: 'js',
      runner: 'nightwatch',
      backend: 'local',
      browsers: ['chrome', 'edge', 'safari'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests',
      seleniumServer: false,
      allowAnonymousMetrics: false
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, {'generate-config': true});

    nightwatchInit.askQuestions = () => {
      return answers;
    };
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    assert.strictEqual(nightwatchInit.onlyConfig, true);

    // Test answers
    if (process.platform === 'darwin') {
      assert.deepEqual(answers.browsers, ['chrome', 'edge', 'safari']);
    } else {
      assert.deepEqual(answers.browsers, ['chrome', 'edge']);
    }
    assert.strictEqual(answers.remoteBrowsers, undefined);
    assert.deepStrictEqual(answers.mobileBrowsers, []);
    assert.strictEqual(answers.mobileRemote, undefined);
    assert.strictEqual(answers.mobileDevice, undefined);
    assert.strictEqual(answers.cloudProvider, undefined);
    assert.strictEqual(answers.remoteName, undefined);
    assert.strictEqual(answers.remoteEnv, undefined);
    assert.strictEqual(answers.seleniumServer, false);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, undefined);
    assert.strictEqual(answers.examplesLocation, undefined);

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.deepEqual(config.custom_assertions_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'safari',
        'chrome',
        'edge'
      ]);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'edge'
      ]);
    }

    // Test Packages and webdrivers installed
    if (process.platform === 'darwin') {
      assert.strictEqual(commandsExecuted.length, 3);
      assert.strictEqual(commandsExecuted[2], 'sudo safaridriver --enable');
    } else {
      assert.strictEqual(commandsExecuted.length, 2);
    }
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install chromedriver --save-dev');

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin') {assert.strictEqual(output.includes('Enabling safaridriver...'), true)}
    assert.strictEqual(output.includes('Happy Testing!!!'), true);

    rmDirSync(rootDir);

  });

  test('generate-config with ts-nightwatch-both', async () => {
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

    mockery.registerMock('inquirer', {
      prompt(questions) {
        if (questions[0].name === 'safaridriver') {
          return {safaridriver: true};
        } else {
          return {};
        }
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      magenta: colorFn,
      cyan: colorFn,
      red: colorFn
    });

    const answers = {
      language: 'ts',
      runner: 'nightwatch',
      backend: 'both',
      cloudProvider: 'other',
      browsers: ['firefox'],
      remoteBrowsers: ['chrome', 'edge', 'safari'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests',
      allowAnonymousMetrics: false
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, {'generate-config': true});

    nightwatchInit.askQuestions = () => {
      return answers;
    };
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    assert.strictEqual(nightwatchInit.onlyConfig, true);

    // Test answers
    assert.deepEqual(answers.browsers, ['firefox']);
    assert.deepEqual(answers.remoteBrowsers, ['chrome', 'edge', 'safari']);
    assert.deepStrictEqual(answers.mobileBrowsers, []);
    assert.strictEqual(answers.mobileRemote, undefined);
    assert.strictEqual(answers.mobileDevice, undefined);
    assert.strictEqual(answers.cloudProvider, 'other');
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.remoteEnv.username, 'REMOTE_USERNAME');
    assert.strictEqual(answers.remoteEnv.access_key, 'REMOTE_ACCESS_KEY');
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.addExamples, undefined);
    assert.strictEqual(answers.examplesLocation, undefined);

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.deepEqual(config.custom_assertions_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.remote.selenium.host, '<remote-hostname>');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
    assert.strictEqual(config.test_settings.remote.username, '${REMOTE_USERNAME}');
    assert.strictEqual(config.test_settings.remote.access_key, '${REMOTE_ACCESS_KEY}');
    assert.deepEqual(Object.keys(config.test_settings), [
      'default',
      'firefox',
      'remote',
      'remote.chrome',
      'remote.safari',
      'remote.edge'
    ]);

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 5);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install typescript --save-dev');
    assert.strictEqual(commandsExecuted[2], 'npm install @types/nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[3], 'npm install ts-node --save-dev');
    assert.strictEqual(commandsExecuted[4], 'npm install geckodriver --save-dev');

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing typescript'), true);
    assert.strictEqual(output.includes('Installing @types/nightwatch'), true);
    assert.strictEqual(
      output.includes(`Success! Configuration file generated at: "${path.join(rootDir, 'nightwatch.conf.js')}"`),
      true
    );
    assert.strictEqual(output.includes('Installing webdriver for Firefox (geckodriver)...'), true);
    assert.strictEqual(output.includes('Happy Testing!!!'), true);

    rmDirSync(rootDir);
  });

  test('make sure we send analytics data if allowAnalytics is set to true', async (done) => {
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

    const answers = {
      language: 'ts',
      runner: 'nightwatch',
      backend: 'both',
      cloudProvider: 'other',
      browsers: ['firefox'],
      remoteBrowsers: ['chrome'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests',
      allowAnonymousMetrics: true
    };

    const scope = nock('https://www.google-analytics.com')
      .post('/mp/collect?api_secret=XuPojOTwQ6yTO758EV4hBg&measurement_id=G-DEKPKZSLXS')
      .reply(204, (uri, requestBody) => {
        assert.notEqual(requestBody.client_id, '');
        assert.notEqual(requestBody.client_id, undefined);
        assert.strictEqual(typeof requestBody.client_id, 'string');
        assert.deepEqual(requestBody.events, {
          'name': 'nw_install',
          'params': {
            'browsers': 'firefox',
            'cloudProvider': 'other',
            'language': 'ts',
            'runner': 'nightwatch'
          }
        });
        assert.strictEqual(requestBody.non_personalized_ads, true);

        return {
          status: 0,
          state: 'success',
          value: []
        };
      });
    
    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, {'generate-config': true});

    nightwatchInit.askQuestions = () => {
      return answers;
    };

    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();
    
    setTimeout(() => {
      assert.ok(scope.isDone());
      done();
    }, 0);

    rmDirSync(rootDir);
  });

  test('make sure we do not send analytics data if allowAnalytics is set to false', async (done) => {
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

    const answers = {
      language: 'ts',
      runner: 'nightwatch',
      backend: 'both',
      cloudProvider: 'other',
      browsers: ['firefox'],
      remoteBrowsers: ['chrome'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests',
      allowAnonymousMetrics: false
    };

    nock('https://www.google-analytics.com')
      .post('/mp/collect?api_secret=XuPojOTwQ6yTO758EV4hBg&measurement_id=G-DEKPKZSLXS')
      .reply(204, (uri, requestBody) => {
        assert.fail();
      });
    
    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, {'generate-config': true});

    nightwatchInit.askQuestions = () => {
      return answers;
    };

    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    rmDirSync(rootDir);

    done();
  });
});
