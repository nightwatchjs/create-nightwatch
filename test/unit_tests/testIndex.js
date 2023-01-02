const assert = require('assert');
const mockery = require('mockery');
const child_process = require.resolve('child_process');
const nock = require('nock');

const VERSION = process.env.npm_package_version;

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

describe('index tests', function() {
  beforeEach(function() {
    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    if (!nock.isActive()) {
      nock.activate();
    }
    nock('https://registry.npmjs.org')
      .get('/create-nightwatch')
      .reply(200, {
        'dist-tags': {
          latest: VERSION
        }
      });
  });

  afterEach(function() {
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
    nock.cleanAll();
    nock.restore();
  });

  it('should not give suggestion when right args are passed ', async function() {
    process.argv = ['node', 'filename.js', '--browser=chrome', '--browser=safari', '--app', 'args'];

    const consoleOutput = [];
    mockLogger(consoleOutput);

    mockery.registerMock('node:fs', {
      existsSync() {
        return false;
      },
      mkdirSync() {
        return true;
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      red: colorFn
    });

    mockery.registerMock('./init', {
      NightwatchInit: class {
        constructor() {}
        run() {}
      }
    });

    mockery.registerMock(child_process, {
      execSync: function() {
        return true;
      }
    });

    const index = require('../../lib/index');
    await index.run();

    const output = consoleOutput.toString();
    // new Nightwatch project initialized
    assert.strictEqual(
      output.includes('package.json not found in the root directory. Initializing a new NPM project..'),
      true
    );
    assert.strictEqual(output.includes('error: unknown option'), false);
  });

  it('should give suggestion when wrong args are passed ', async function() {
    process.argv = ['node', 'filename.js', '--browsers=chrome', '--browsers=safari'];

    const consoleOutput = [];
    mockLogger(consoleOutput);

    mockery.registerMock('node:fs', {
      existsSync() {
        return false;
      },
      mkdirSync() {
        return true;
      }
    });

    mockery.registerMock(child_process, {
      execSync: function() {
        return true;
      }
    });

    const index = require('../../lib/index');
    await index.run();

    const output = consoleOutput.toString();
    assert.strictEqual(
      output.includes('error: unknown option \'browsers\'\n(Did you mean browser?)'),
      true
    );
  });

  it('should give warning to run with latest package when using older version', async function() {
    process.argv = ['node', 'filename.js', '--browser=safari', 'args'];

    const consoleOutput = [];
    mockLogger(consoleOutput);

    mockery.registerMock('node:fs', {
      existsSync() {
        return false;
      },
      mkdirSync() {
        return true;
      }
    });

    const colorFn = (arg) => arg;
    mockery.registerMock('ansi-colors', {
      green: colorFn,
      yellow: colorFn,
      red: colorFn
    });

    mockery.registerMock('./init', {
      NightwatchInit: class {
        constructor() {}
        run() {}
      }
    });

    mockery.registerMock(child_process, {
      execSync: function() {
        return true;
      }
    });

    nock.cleanAll();
    nock('https://registry.npmjs.org')
      .get('/create-nightwatch')
      .reply(200, {
        'dist-tags': {
          latest: '1.0.2'
        }
      });

    const index = require('../../lib/index');
    await index.run();

    const output = consoleOutput.toString();
    assert.strictEqual(
      output.includes(`We've updated this onboarding tool: ${VERSION} -> 1.0.2. To get the latest experience, run: npm init nightwatch@latest`),
      true
    );
  });
});
