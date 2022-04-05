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
      if (!fs.existsSync(rootDir)) {fs.mkdirSync(rootDir, {recursive: true})}
      execSync('npm init -y', {
        'stdio': 'pipe',
        'cwd': rootDir
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
    mockery.registerMock('./logger', class {
      static error(...msgs) {
        consoleOutput.push(...msgs);
      }
    });

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
      cyan: colorFn
    })

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
    }
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestLocation = () => {
      return configPath;
    }

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
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, path.join('tests', 'nightwatch-examples'));

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('tests', 'nightwatch-examples'));
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'safari', 'chrome', 'edge', 'selenium_server', 'selenium.chrome', 'selenium.edge']);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'chrome', 'edge', 'selenium_server', 'selenium.chrome', 'selenium.edge']);
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
    assert.deepEqual(exampleFiles, ['duckDuckGo.js', 'ecosia.js', 'vueTodoList.js'])

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin')
      assert.strictEqual(output.includes('Enabling safaridriver...'), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes(`Success! Generated some example files at '${path.join('tests', 'nightwatch-examples')}'.`), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('tests', 'nightwatch-examples')}`), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('tests', 'nightwatch-examples', 'ecosia.js')}`), true);
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(output.includes('To run tests on your local selenium-server, use command:'), true);

    rmDirSync(rootDir);

    done();
  });

  test('with js-cucumber-remote', async (done) => {
    const consoleOutput = [];
    mockery.registerMock('./logger', class {
      static error(...msgs) {
        consoleOutput.push(...msgs);
      }
    });

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
      cyan: colorFn
    })

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
    }
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestLocation = () => {
      return configPath;
    }

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

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests']);
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
    assert.deepEqual(exampleFiles, ['nightwatch.feature', 'step_definitions'])

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @cucumber/cucumber'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Generating example for CucumberJS...'), true);
    assert.strictEqual(output.includes(`Success! Generated an example for CucumberJS at "${path.join('tests', 'features', 'nightwatch-examples')}"`), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes('To run your tests with CucumberJS, simply run:'), true);
    assert.strictEqual(output.includes('npx nightwatch --env remote'), true);
    assert.strictEqual(output.includes('To run an example test with CucumberJS, run:'), true);
    assert.strictEqual(output.includes(`npx nightwatch ${path.join('tests', 'features', 'nightwatch-examples')} --env remote`), true);
    assert.strictEqual(output.includes('For more details on using CucumberJS with Nightwatch, visit:'), true);

    rmDirSync(rootDir);

    done();
  });

  test('with js-mocha-both', async (done) => {
    const consoleOutput = [];
    mockery.registerMock('./logger', class {
      static error(...msgs) {
        consoleOutput.push(...msgs);
      }
    });

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
      cyan: colorFn
    })

    const answers = {
      language: 'js',
      runner: 'mocha',
      backend: 'both',
      browsers: ['chrome', 'safari', 'ie'],
      hostname: 'hub.browserstack.com',
      port: 4444,
      testsLocation: 'tests',
      baseUrl: 'https://nightwatchjs.org',
      addExamples: true,
      examplesLocation: 'nightwatch-examples'
    };

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, []);

    nightwatchInit.askQuestions = () => {
      return answers;
    }
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestLocation = () => {
      return configPath;
    }

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
    assert.strictEqual(answers.examplesLocation, 'nightwatch-examples');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, 'tests');
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch-examples');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['tests', 'nightwatch-examples']);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.test_runner.type, 'mocha');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.browserstack.selenium.host, 'hub.browserstack.com');
    assert.strictEqual(config.test_settings.browserstack.selenium.port, 4444);
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'safari', 'chrome', 'browserstack', 'browserstack.local', 'browserstack.chrome', 'browserstack.ie', 'browserstack.safari', 'browserstack.local_chrome', 'selenium_server', 'selenium.chrome']);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'chrome', 'browserstack', 'browserstack.local', 'browserstack.chrome', 'browserstack.ie', 'browserstack.safari', 'browserstack.local_chrome', 'selenium_server', 'selenium.chrome']);
    }

    // Test Packages and webdrivers installed
    assert.strictEqual(commandsExecuted.length, 4);
    assert.strictEqual(commandsExecuted[0], 'npm install nightwatch --save-dev');
    assert.strictEqual(commandsExecuted[1], 'npm install @nightwatch/selenium-server --save-dev');
    assert.strictEqual(commandsExecuted[2], 'java -version');
    assert.strictEqual(commandsExecuted[3], 'npm install chromedriver --save-dev');

    // Test examples copied
    const examplesPath = path.join(rootDir, answers.examplesLocation);
    assert.strictEqual(fs.existsSync(examplesPath), true);
    const exampleFiles = fs.readdirSync(examplesPath);
    assert.strictEqual(exampleFiles.length, 3);
    assert.deepEqual(exampleFiles, ['duckDuckGo.js', 'ecosia.js', 'vueTodoList.js'])

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin')
      assert.strictEqual(output.includes('Please run \'sudo safaridriver --enable\' command to enable safaridriver later.'), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'nightwatch-examples\'.'), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}nightwatch-examples`), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch-examples', 'ecosia.js')}`), true);
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(output.includes('To run tests on your local selenium-server, use command:'), true);

    rmDirSync(rootDir);
    
    done();
  });

  test('with ts-nightwatch-remote', async (done) => {
    const consoleOutput = [];
    mockery.registerMock('./logger', class {
      static error(...msgs) {
        consoleOutput.push(...msgs);
      }
    });

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
      cyan: colorFn
    })

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
    }
    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestLocation = () => {
      return configPath;
    }

    await nightwatchInit.run();

    // Test answers
    assert.deepEqual(answers.browsers, undefined);
    assert.deepEqual(answers.remoteBrowsers, ['chrome', 'edge', 'safari']);
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.browserstack, undefined);
    assert.strictEqual(answers.seleniumServer, undefined);
    assert.strictEqual(answers.defaultBrowser, 'chrome');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, path.join('tests', 'nightwatch-examples'));

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, 'dist');
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, 'test');
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, path.join('dist', 'tests'));
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, path.join('dist', 'tests', 'nightwatch-examples'));
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, [path.join('dist', 'tests')]);
    assert.strictEqual(config.test_settings.default.launch_url, 'https://nightwatchjs.org');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'chrome');
    assert.strictEqual(config.test_settings.remote.selenium.host, 'localhost');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
    assert.deepEqual(Object.keys(config.test_settings), ['default', 'remote', 'remote.chrome', 'remote.safari', 'remote.edge']);

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
    assert.deepEqual(exampleFiles, ['github.ts', 'google.ts'])

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing typescript'), true);
    assert.strictEqual(output.includes('Installing @types/nightwatch'), true);
    assert.strictEqual(output.includes(`Success! Configuration file generated at: "${path.join(rootDir, 'nightwatch.conf.js')}"`), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes(`Success! Generated some example files at '${path.join('tests', 'nightwatch-examples')}'.`), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes('npm run test -- --env remote'), true);
    assert.strictEqual(output.includes(`npm run test -- .${path.sep}${path.join('dist', 'tests', 'nightwatch-examples', 'github.js')} --env remote`), true);

    rmDirSync(rootDir);

    done();
  });

  test('with yes flag', async (done) => {
    const consoleOutput = [];
    mockery.registerMock('./logger', class {
      static error(...msgs) {
        consoleOutput.push(...msgs);
      }
    });

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
      cyan: colorFn
    });

    const answers = require('../../lib/defaults.json');
    mockery.registerMock('./defaults.json', answers);

    const {NightwatchInit} = require('../../lib/init');
    const nightwatchInit = new NightwatchInit(rootDir, ['yes']);

    const configPath = path.join(rootDir, 'nightwatch.conf.js');
    nightwatchInit.getConfigDestLocation = () => {
      return configPath;
    }

    await nightwatchInit.run();

    // Test answers
    if (process.platform === 'darwin') {
      assert.deepEqual(answers.browsers, ['firefox', 'chrome', 'edge', 'ie', 'safari']);
    } else {
      assert.deepEqual(answers.browsers, ['firefox', 'chrome', 'edge', 'ie']);
    }
    assert.deepEqual(answers.remoteBrowsers, ['firefox', 'chrome', 'edge', 'ie', 'safari']);
    assert.strictEqual(answers.remoteName, 'remote');
    assert.strictEqual(answers.browserstack, false);
    assert.strictEqual(answers.seleniumServer, true);
    assert.strictEqual(answers.defaultBrowser, 'firefox');
    assert.strictEqual(answers.addExamples, true);
    assert.strictEqual(answers.examplesLocation, 'nightwatch-examples');

    // Test otherInfo
    assert.strictEqual(nightwatchInit.otherInfo.tsOutDir, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.tsTestScript, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.testsJsSrc, undefined);
    assert.strictEqual(nightwatchInit.otherInfo.examplesJsSrc, 'nightwatch-examples');
    assert.strictEqual(nightwatchInit.otherInfo.cucumberExamplesAdded, undefined);

    // Test generated config
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = require(configPath);
    assert.deepEqual(config.src_folders, ['nightwatch-examples']);
    assert.strictEqual(config.test_settings.default.launch_url, 'http://localhost');
    assert.strictEqual(config.test_settings.default.desiredCapabilities.browserName, 'firefox');
    assert.strictEqual(config.test_settings.remote.selenium.host, '<remote-host>');
    assert.strictEqual(config.test_settings.remote.selenium.port, 4444);
    if (process.platform === 'darwin') {
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'safari', 'firefox', 'chrome', 'edge', 'remote', 'remote.chrome', 'remote.firefox', 'remote.safari', 'remote.edge', 'remote.ie', 'selenium_server', 'selenium.chrome', 'selenium.firefox', 'selenium.edge']);
    } else {
      assert.deepEqual(Object.keys(config.test_settings), ['default', 'firefox', 'chrome', 'edge', 'remote', 'remote.chrome', 'remote.firefox', 'remote.safari', 'remote.edge', 'remote.ie', 'selenium_server', 'selenium.chrome', 'selenium.firefox', 'selenium.edge']);
    }

    // Test Packages and webdrivers installed
    if (process.platform === 'darwin') {
      assert.strictEqual(commandsExecuted.length, 6);
      assert.strictEqual(commandsExecuted[5], 'sudo safaridriver --enable');
    } else {
      assert.strictEqual(commandsExecuted.length, 5);
    }
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
    assert.deepEqual(exampleFiles, ['duckDuckGo.js', 'ecosia.js', 'vueTodoList.js'])

    // Test console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Installing nightwatch'), true);
    assert.strictEqual(output.includes('Installing @nightwatch/selenium-server'), true);
    assert.strictEqual(output.includes('Success! Configuration file generated at:'), true);
    assert.strictEqual(output.includes('Installing webdriver for Firefox (geckodriver)...'), true);
    assert.strictEqual(output.includes('Installing webdriver for Chrome (chromedriver)...'), true);
    if (process.platform === 'darwin')
      assert.strictEqual(output.includes('Enabling safaridriver...'), true);
    assert.strictEqual(output.includes('Generating example files...'), true);
    assert.strictEqual(output.includes('Success! Generated some example files at \'nightwatch-examples\'.'), true);
    assert.strictEqual(output.includes('Nightwatch setup complete!!'), true);
    assert.strictEqual(output.includes('First, change directory to the root dir of your project:'), true);
    assert.strictEqual(output.includes('cd test_output'), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}nightwatch-examples`), true);
    assert.strictEqual(output.includes(`npx nightwatch .${path.sep}${path.join('nightwatch-examples', 'ecosia.js')}`), true);
    assert.strictEqual(output.includes('[Selenium Server]'), true);
    assert.strictEqual(output.includes('To run tests on your local selenium-server, use command:'), true);

    rmDirSync(rootDir);

    done();
  });
});