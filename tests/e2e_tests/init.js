const assert = require('assert');
const mockery = require('mockery');
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {rmDirSync} = require('../../lib/utils');

const rootDir = path.join(process.cwd(), 'test_output');

describe('e2e tests for init', () => {
  beforeEach(() => {
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

  test('with js-nightwatch-local', async (done) => {
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
      browsers: ['chrome', 'edge', 'safari', 'selenium-server'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests'
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
      assert.deepEqual(answers.browsers, ['chrome', 'edge', 'safari']);
    } else {
      assert.deepEqual(answers.browsers, ['chrome', 'edge']);
    }
    assert.strictEqual(answers.remoteBrowsers, undefined);
    assert.strictEqual(answers.remoteName, undefined);
    assert.strictEqual(answers.browserstack, undefined);
    assert.strictEqual(answers.seleniumServer, true);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.testsLocation, 'tests');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'tests');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.deepEqual(config.page_objects_path, [path.join('tests', 'page-objects')]);
    assert.deepEqual(config.custom_commands_path, [path.join('tests', 'custom-commands')]);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'safari',
        'chrome',
        'edge',
        'selenium_server',
        'selenium.chrome',
        'selenium.edge'
      ]);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'edge',
        'selenium_server',
        'selenium.chrome',
        'selenium.edge'
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
    assert.strictEqual(commandsExecuted[1], 'npm install @nightwatch/selenium-server --save-dev');
    assert.strictEqual(commandsExecuted[2], 'java -version');
    assert.strictEqual(commandsExecuted[3], 'npm install chromedriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 3);
    assert.deepEqual(exampleFiles, ['custom-commands', 'page-objects', 'specs']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin') {assert.strictEqual(output.includes('Enabling safaridriver...'), true)}
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'tests\'.'), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('tests', 'specs')}`),
      true
    );
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('tests', 'specs', 'basic', 'ecosia.js')}`),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(output.includes('To run tests on your local selenium-server, use command:'), true);
    assert.strictEqual(output.includes('Note: Microsoft Edge Webdriver is not installed automatically.'), true);

    rmDirSync(rootDir);

    done();
  });

  test('with js-cucumber-remote', async (done) => {
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
      browsers: ['chrome', 'edge', 'selenium-server'],
      hostname: 'localhost',
      port: 4444,
      testsLocation: 'tests',
      featurePath: path.join('tests', 'features'),
      baseUrl: 'https://nightwatchjs.org'
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
    assert.deepEqual(answers.remoteBrowsers, ['chrome', 'edge']);
    assert.strictEqual(answers.browserstack, undefined);
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, path.join('tests', 'features', 'nightwatch-examples'));

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
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
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.test_runner.type, 'cucumber');
    // assert.strictEqual(config.test_settings.default.test_runner.options.feature_path, path.join('tests', 'features'));
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.remote.selenium.host, 'localhost');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
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
        `Success! Generated an example for CucumberJS at "${path.join('tests', 'features', 'nightwatch-examples')}"`
      ),
      true
    );
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes('To run your tests with CucumberJS, simply run:'), true);
    assert.strictEqual(output.includes('npx nightwatch --env remote'), true);
    assert.strictEqual(output.includes('To run an example test with CucumberJS, run:'), true);
    assert.strictEqual(
      output.includes(`npx nightwatch ${path.join('tests', 'features', 'nightwatch-examples')} --env remote`),
      true
    );
    assert.strictEqual(output.includes('For more details on using CucumberJS with Nightwatch, visit:'), true);
    assert.strictEqual(output.includes('Note: Microsoft Edge Webdriver is not installed automatically.'), false);

    rmDirSync(rootDir);

    done();
  });

  test('with js-mocha-both', async (done) => {
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
      browsers: ['chrome', 'safari', 'ie'],
      hostname: 'hub.browserstack.com',
      port: 4444,
      testsLocation: 'tests',
      baseUrl: 'https://nightwatchjs.org'
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
      assert.deepEqual(answers.browsers, ['chrome', 'safari', 'ie']);
    } else {
      assert.deepEqual(answers.browsers, ['chrome', 'ie']);
    }
    assert.deepEqual(answers.remoteBrowsers, ['chrome', 'safari', 'ie']);
    assert.strictEqual(answers.remoteName, 'browserstack');
    assert.strictEqual(answers.seleniumServer, true);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.browserstack, true);
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, path.join('tests', 'nightwatch-examples'));

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('tests', 'nightwatch-examples'));
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.deepEqual(config.page_objects_path, [path.join('tests', 'nightwatch-examples', 'page-objects')]);
    assert.deepEqual(config.custom_commands_path, [path.join('tests', 'nightwatch-examples', 'custom-commands')]);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.test_runner.type, 'mocha');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
    assert.strictEqual(config.test_settings.browserstack.selenium.port, 4444);
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'safari',
        'chrome',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.ie',
        'browserstack.safari',
        'browserstack.local_chrome',
        'selenium_server',
        'selenium.chrome',
        'selenium.ie'
      ]);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'browserstack',
        'browserstack.local',
        'browserstack.chrome',
        'browserstack.ie',
        'browserstack.safari',
        'browserstack.local_chrome',
        'selenium_server',
        'selenium.chrome',
        'selenium.ie'
      ]);
    }

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 5);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install @nightwatch/selenium-server --save-dev');
    assert.strictEqual(commandsExecuted[2], 'java -version');
    assert.strictEqual(commandsExecuted[3], 'npm install chromedriver --save-dev');
    assert.strictEqual(commandsExecuted[4], 'npm install iedriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 3);
    assert.deepEqual(exampleFiles, ['custom-commands', 'page-objects', 'specs']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    assert.strictEqual(output.includes('Installing webdriver for IE (iedriver)...'), true);
    if (process.platform === 'darwin') {
      assert.strictEqual(
        output.includes('Please run \'sudo safaridriver --enable\' command to enable safaridriver later.'),
        true
      );
    }
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes(`Success! Generated some example files at '${path.join('tests', 'nightwatch-examples')}'.`), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('tests', 'nightwatch-examples', 'specs')}`), true);
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('tests', 'nightwatch-examples', 'specs', 'basic', 'ecosia.js')}`),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(output.includes('To run tests on your local selenium-server, use command:'), true);

    rmDirSync(rootDir);

    done();
  });

  test('with ts-nightwatch-remote', async (done) => {
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
      browsers: ['firefox'],
      remoteBrowsers: ['chrome', 'edge', 'safari'],
      hostname: 'localhost',
      port: 4444,
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests'
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
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.browserstack, undefined);
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'tests');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, 'dist');
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, 'test');
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, path.join('dist', 'tests'));
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('dist', 'tests'));
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, [path.join('dist', 'tests')]);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.remote.selenium.host, 'localhost');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
    assert.deepEqual(Object.keys(config.test_settings), [
      'default',
      'remote',
      'remote.chrome',
      'remote.safari',
      'remote.edge'
    ]);

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 3);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install typescript --save-dev');
    assert.strictEqual(commandsExecuted[2], 'npm install @types/nightwatch --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 2);
    assert.deepEqual(exampleFiles, ['github.ts', 'google.ts']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing typescript'), true);
    assert.strictEqual(output.includes('Installing @types/nightwatch'), true);
    assert.strictEqual(
      output.includes(`Success! Configuration file generated at: "${path.join(rootDir, 'nightwatch.conf.js')}"`),
      true
    );
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(
      output.includes('Success! Generated some example files at \'tests\'.'),
      true
    );
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes('npm run test -- --env remote'), true);
    assert.strictEqual(
      output.includes(
        `npm run test -- .${path.sep}${path.join('dist', 'tests', 'github.js')} --env remote`
      ),
      true
    );
    assert.strictEqual(output.includes('Note: Microsoft Edge Webdriver is not installed automatically.'), false);

    rmDirSync(rootDir);

    done();
  });

  test('with ts-mocha-both-browserstack and non-default config', async (done) => {
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

    // Create an non-empty 'tests/nightwatch-examples' folder in the rootDir.
    fs.mkdirSync(path.join(rootDir, 'tests', 'nightwatch-examples', 'sample'), {recursive: true});

    const answers = {
      language: 'ts',
      runner: 'mocha',
      backend: 'both',
      browsers: ['firefox', 'selenium-server'],
      remoteBrowsers: ['chrome'],
      hostname: 'hub.browserstack.com',
      port: 4444,
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests'
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
    assert.deepEqual(answers.browsers, ['firefox']);
    assert.deepEqual(answers.remoteBrowsers, ['chrome']);
    assert.strictEqual(answers.remoteName, 'browserstack');
    assert.strictEqual(answers.browserstack, true);
    assert.strictEqual(answers.seleniumServer, true);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, path.join('tests', 'nightwatch-examples'));

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, 'dist');
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, 'test');
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, path.join('dist', 'tests'));
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('dist', 'tests', 'nightwatch-examples'));
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, configFileName);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, [path.join('dist', 'tests')]);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
    assert.strictEqual(config.test_settings.browserstack.selenium.port, 4444);
    assert.deepEqual(Object.keys(config.test_settings), [
      'default',
      'firefox',
      'browserstack',
      'browserstack.local',
      'browserstack.chrome',
      'browserstack.local_chrome',
      'selenium_server',
      'selenium.firefox'
    ]);

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 6);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install typescript --save-dev');
    assert.strictEqual(commandsExecuted[2], 'npm install @types/nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[3], 'npm install @nightwatch/selenium-server --save-dev');
    assert.strictEqual(commandsExecuted[4], 'java -version');
    assert.strictEqual(commandsExecuted[5], 'npm install geckodriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    // examples not copied
    assert.strictEqual(exampleFiles.length, 1);
    assert.deepEqual(exampleFiles, ['sample']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing typescript'), true);
    assert.strictEqual(output.includes('Installing @types/nightwatch'), true);
    assert.strictEqual(
      output.includes(`Success! Configuration file generated at: "${path.join(rootDir, configFileName)}"`),
      true
    );
    assert.strictEqual(output.includes('To use this configuration file, run the tests using --config flag.'), true);
    assert.strictEqual(output.includes('Installing webdriver for Firefox (geckodriver)...'), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(
      output.includes(`Examples already exists at '${path.join('tests', 'nightwatch-examples')}'. Skipping...`),
      true
    );
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes('npm run test -- --config new-config.conf.js'), true);
    assert.strictEqual(
      output.includes(
        `npm run test -- .${path.sep}${path.join(
          'dist',
          'tests',
          'nightwatch-examples',
          'github.js'
        )} --config new-config.conf.js`
      ),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(
      output.includes('To run tests on your local selenium-server, build your project (tsc) and then run:'),
      true
    );
    assert.strictEqual(output.includes('npx nightwatch --env selenium_server --config new-config.conf.js'), true);
    assert.strictEqual(output.includes('Or, run this command:'), true);
    assert.strictEqual(output.includes('npm run test -- --env selenium_server --config new-config.conf.js'), true);

    rmDirSync(rootDir);

    done();
  });

  test('with yes flag', async (done) => {
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
      browser: ['firefox', 'chrome', 'selenium-server']
    });

    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestPath = () => {
      return configPath;
    };

    await nightwatchInit.run();

    // Test answers
    assert.deepEqual(answers.browsers, ['firefox', 'chrome']);
    assert.deepEqual(answers.remoteBrowsers, ['firefox', 'chrome']);
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.browserstack, undefined);
    assert.strictEqual(answers.seleniumServer, true);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.testsLocation, 'nightwatch-e2e');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch-e2e');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'nightwatch-e2e');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch-e2e');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.nonDefaultConfigName, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['nightwatch-e2e']);
    assert.deepEqual(config.page_objects_path, [path.join('nightwatch-e2e', 'page-objects')]);
    assert.deepEqual(config.custom_commands_path, [path.join('nightwatch-e2e', 'custom-commands')]);
    assert.strictEqual(config.test_settings.default.launch_url, 'http://localhost');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.remote.selenium.host, '<remote-host>');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
    assert.deepEqual(Object.keys(config.test_settings), [
      'default',
      'firefox',
      'chrome',
      'remote',
      'remote.chrome',
      'remote.firefox',
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
    assert.strictEqual(exampleFiles.length, 3);
    assert.deepEqual(exampleFiles, ['custom-commands', 'page-objects', 'specs']);

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Firefox (geckodriver)...'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'nightwatch-e2e\'.'), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch-e2e', 'specs')}`), true);
    assert.strictEqual(
      output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch-e2e', 'specs', 'basic', 'ecosia.js')}`),
      true
    );
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(output.includes('To run tests on your local selenium-server, use command:'), true);

    rmDirSync(rootDir);

    done();
  });

  test('generate-config with js-nightwatch-local', async (done) => {
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
      browsers: ['chrome', 'edge', 'safari', 'selenium-server'],
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests'
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
    assert.strictEqual(answers.remoteName, undefined);
    assert.strictEqual(answers.browserstack, undefined);
    assert.strictEqual(answers.seleniumServer, true);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, undefined);
    assert.strictEqual(answers.examplesLocation, undefined);

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'safari',
        'chrome',
        'edge',
        'selenium_server',
        'selenium.chrome',
        'selenium.edge'
      ]);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), [
        'default',
        'chrome',
        'edge',
        'selenium_server',
        'selenium.chrome',
        'selenium.edge'
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
    assert.strictEqual(commandsExecuted[1], 'npm install @nightwatch/selenium-server --save-dev');
    assert.strictEqual(commandsExecuted[2], 'java -version');
    assert.strictEqual(commandsExecuted[3], 'npm install chromedriver --save-dev');

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin') {assert.strictEqual(output.includes('Enabling safaridriver...'), true)}
    assert.strictEqual(output.includes('Happy Testing!!!'), true);

    rmDirSync(rootDir);

    done();
  });

  test('generate-config with ts-nightwatch-both', async (done) => {
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
      browsers: ['firefox'],
      remoteBrowsers: ['chrome', 'edge', 'safari'],
      hostname: 'localhost',
      port: 4444,
      baseUrl: 'https://nightwatchjs.org',
      testsLocation: 'tests'
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
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.browserstack, undefined);
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.addExamples, undefined);
    assert.strictEqual(answers.examplesLocation, undefined);

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.deepEqual(config.page_objects_path, []);
    assert.deepEqual(config.custom_commands_path, []);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.remote.selenium.host, 'localhost');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
    assert.deepEqual(Object.keys(config.test_settings), [
      'default',
      'firefox',
      'remote',
      'remote.chrome',
      'remote.safari',
      'remote.edge'
    ]);

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 4);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install typescript --save-dev');
    assert.strictEqual(commandsExecuted[2], 'npm install @types/nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[3], 'npm install geckodriver --save-dev');

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
    assert.strictEqual(output.includes('Since you are using TypeScript, please verify src_folders'), true);
    assert.strictEqual(output.includes('It should point to the location of your transpiled (JS) test files.'), true);
    assert.strictEqual(output.includes('Happy Testing!!!'), true);

    rmDirSync(rootDir);

    done();
  });
});
