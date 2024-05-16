const path = require('path');
const mockery = require('mockery');
const assert = require('assert');
const nock = require('nock');

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

describe('test run function', function() {
  beforeEach(function() {
    this.originalProcessArgv = process.argv;
    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    if (!nock.isActive()) {
      nock.activate();
    }
    nock('https://registry.npmjs.org')
      .get('/create-nightwatch')
      .reply(200, {
        'dist-tags': {
          latest: '1.0.2'
        }
      });
    
  });

  afterEach(function() {
    process.argv = this.originalProcessArgv;
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
    nock.cleanAll();
    nock.restore();
  });

  it('works with no argument and package.json present', async function() {
    process.argv = ['node', 'filename.js'];

    mockLogger([]);


    mockery.registerMock('./utils', {
      isNodeProject() {
        return true;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');
    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, process.cwd());
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: false,
      app: false
    });
  });

  it('works with no argument, package.json not present, and root dir empty', async function() {
    process.argv = ['node', 'filename.js'];

    const consoleOutput = [];
    mockLogger(consoleOutput);

    mockery.registerMock('./utils', {
      isNodeProject() {
        return false;
      }
    });

    mockery.registerMock('node:fs', {
      readdirSync() {
        return [];
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');

    let newNodeProjectInitialized = false;
    let newNodeProjectRootDir;
    index.initializeNodeProject = (rootDir) => {
      newNodeProjectInitialized = true;
      newNodeProjectRootDir = rootDir;
    };

    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, process.cwd());
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: false,
      app: false
    });

    // Check if new node project initialized in correct dir
    assert.strictEqual(newNodeProjectInitialized, true);
    assert.strictEqual(newNodeProjectRootDir, process.cwd());
  });

  it('works with no argument, package.json not present, and root dir not empty', async function() {
    process.argv = ['node', 'filename.js'];

    const consoleOutput = [];
    mockLogger(consoleOutput);

    mockery.registerMock('./utils', {
      isNodeProject() {
        return false;
      }
    });

    mockery.registerMock('node:fs', {
      readdirSync() {
        return ['sample.txt'];
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');

    let rootDirConfirmationPrompted = false;
    index.confirmRootDir = (rootDir) => {
      rootDirConfirmationPrompted = true;

      return rootDir;
    };

    let newNodeProjectInitialized = false;
    let newNodeProjectRootDir;
    index.initializeNodeProject = (rootDir) => {
      newNodeProjectInitialized = true;
      newNodeProjectRootDir = rootDir;
    };

    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, process.cwd());
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: false,
      app: false
    });

    // Check if root dir confirmation prompted
    assert.strictEqual(rootDirConfirmationPrompted, true);

    // Check if new node project initialized in correct dir
    assert.strictEqual(newNodeProjectInitialized, true);
    assert.strictEqual(newNodeProjectRootDir, process.cwd());
  });

  it('works with many arguments, no options, and package.json present', async function() {
    process.argv = ['node', 'filename.js', 'new-project', 'some', 'random', 'args'];
    const expectedRootDir = path.join(process.cwd(), 'new-project');

    mockLogger([]);

    mockery.registerMock('node:fs', {
      existsSync() {
        return true;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');
    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, expectedRootDir);
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: false,
      app: false
    });
  });

  it('works with many argument, no options, and package.json not present', async function() {
    process.argv = ['node', 'filename.js', 'new-project', 'some', 'random', 'args'];
    const expectedRootDir = path.join(process.cwd(), 'new-project');

    const consoleOutput = [];
    mockLogger(consoleOutput);

    let newDirCreatedRecursively = false;
    mockery.registerMock('node:fs', {
      existsSync() {
        return false;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');

    let newNodeProjectInitialized = false;
    let newNodeProjectRootDir;
    index.initializeNodeProject = (rootDir) => {
      newNodeProjectInitialized = true;
      newNodeProjectRootDir = rootDir;
    };

    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, expectedRootDir);
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: false,
      app: false
    });

    // Check if new node project initialized in correct dir
    assert.strictEqual(newNodeProjectInitialized, true);
    assert.strictEqual(newNodeProjectRootDir, expectedRootDir);
  });

  it('works with many arguments, generate-config options, and package.json present', async function() {
    process.argv = ['node', 'filename.js', 'new-project', 'random', '--generate-config', 'args'];
    const expectedRootDir = path.join(process.cwd(), 'new-project');

    mockLogger([]);

    mockery.registerMock('node:fs', {
      existsSync() {
        return true;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');
    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, expectedRootDir);
    assert.deepEqual(optionsPassed, {
      'generate-config': true,
      native: false,
      app: false
    });
  });

  it('works with many arguments, generate-config options, and package.json not present', async function() {
    process.argv = ['node', 'filename.js', 'new-project', 'random', '--generate-config', 'args'];

    const origProcessExit = process.exit;

    let processExitCode;
    process.exit = (code) => {
      processExitCode = code;
    };

    const consoleOutput = [];
    mockLogger(consoleOutput);

    mockery.registerMock('node:fs', {
      existsSync() {
        return false;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');
    await index.run();

    // Check the arguments passed to NightwatchInitiator (it won't be run due to error)
    assert.strictEqual(rootDirPassed, undefined);
    assert.deepEqual(optionsPassed, undefined);

    // Check if process exited with code 1
    assert.strictEqual(processExitCode, 1);

    // Check console output (error)
    const output = consoleOutput.toString();
    assert.strictEqual(
      output.includes('package.json not found. Please run this command from your existing Nightwatch project.'),
      true
    );
    assert.strictEqual(
      output.includes('use `npm init nightwatch new-project` to initialize a new Nightwatch project instead.'),
      true
    );

    process.exit = origProcessExit;
  });

  it('works with many arguments, browsers and native options, and package.json present', async function() {
    process.argv = ['node', 'filename.js', 'new-project', 'random', '--browser=chrome', '--browser=safari', '--native', 'args'];
    const expectedRootDir = path.join(process.cwd(), 'new-project');

    mockLogger([]);

    mockery.registerMock('node:fs', {
      existsSync() {
        return true;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');
    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, expectedRootDir);
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: true,
      app: true,
      b: ['chrome', 'safari'],
      browser: ['chrome', 'safari']
    });
  });

  it('works with no arguments, browser options without =, and package.json not present', async function() {
    process.argv = ['node', 'filename.js', '--browser', 'chrome', '--browser', 'safari'];

    const consoleOutput = [];
    mockLogger(consoleOutput);

    mockery.registerMock('./utils', {
      isNodeProject() {
        return false;
      }
    });

    mockery.registerMock('node:fs', {
      readdirSync() {
        return [];
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');

    let newNodeProjectInitialized = false;
    let newNodeProjectRootDir;
    index.initializeNodeProject = (rootDir) => {
      newNodeProjectInitialized = true;
      newNodeProjectRootDir = rootDir;
    };

    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, process.cwd());
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: false,
      app: false,
      b: ['chrome', 'safari'],
      browser: ['chrome', 'safari']
    });

    // Check if new node project initialized in correct dir
    assert.strictEqual(newNodeProjectInitialized, true);
    assert.strictEqual(newNodeProjectRootDir, process.cwd());
  });

  it('works with many arguments, many options, and package.json present', async function() {
    process.argv = ['node', 'filename.js', 'new-project', '-y', '--hello', '--there=hi', '-d', '--generate-config'];
    const expectedRootDir = path.join(process.cwd(), 'new-project');

    mockLogger([]);

    mockery.registerMock('node:fs', {
      existsSync() {
        return true;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');
    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, expectedRootDir);
    assert.deepEqual(optionsPassed, {
      'generate-config': true,
      native: false,
      app: false,
      d: true,
      hello: true,
      there: 'hi',
      y: true,
      yes: true
    });
  });

  it('works with many arguments, single browser and app option', async function() {
    process.argv = ['node', 'filename.js', 'new-project', 'random', '--browser=safari', '--app', 'args'];
    const expectedRootDir = path.join(process.cwd(), 'new-project');

    mockLogger([]);

    mockery.registerMock('node:fs', {
      existsSync() {
        return true;
      }
    });

    let rootDirPassed;
    let optionsPassed;
    mockery.registerMock('@nightwatch/setup-tools', {
      NightwatchInitiator: class {
        constructor(rootDir, options) {
          rootDirPassed = rootDir;
          optionsPassed = options;
        }
        run() {}
      }
    });

    const index = require('../../dist/index');
    await index.run();

    // Check the arguments passed to NightwatchInitiator
    assert.strictEqual(rootDirPassed, expectedRootDir);
    assert.deepEqual(optionsPassed, {
      'generate-config': false,
      native: true,
      app: true,
      b: 'safari',
      browser: ['safari']
    });
  });
});
