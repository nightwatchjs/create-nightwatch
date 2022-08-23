const assert = require('assert');
const mockery = require('mockery');
const child_process = require.resolve('child_process');
const nock = require('nock');
const VERSION = '1.1.2';

describe('index tests', () => {

  beforeEach(() => {
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

  afterEach(() => {
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
    nock.cleanAll();
    nock.restore();
  });
  
  test('should not give suggestion when right args are passed ', async () => {
    process.argv = ['node', 'filename.js', '--browser=chrome', '--browser=safari', 'args'];

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
      existsSync() {
        return false;
      },
      mkdirSync() {
        return true;
      }
    });

    mockery.registerMock('./init', {
      NightwatchInit: class {
        constructor(rootDir, options) {
        }
        run() {}
      }
    });

    mockery.registerMock(child_process, {
      execSync: () => {
        return true;
      }
    });

    const index = require('../../lib/index');
    await index.run();

    const output = consoleOutput.toString();
    assert.strictEqual(
      output.includes('[33mpackage.json[39m not found in the root directory. Initializing a new NPM project..'),
      true
    );
  });

  test('should give suggestion when wrong args are passed ', async () => {
    process.argv = ['node', 'filename.js', '--browsers=chrome', '--browsers=safari'];

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
      existsSync() {
        return false;
      },
      mkdirSync() {
        return true;
      }
    });

    mockery.registerMock(child_process, {
      execSync: () => {
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

  test('should give warning to run with latest package when using older version', async () => {
    process.argv = ['node', 'filename.js', '--browser=chrome', '--browser=safari', 'args'];

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
      existsSync() {
        return false;
      },
      mkdirSync() {
        return true;
      }
    });

    mockery.registerMock('./init', {
      NightwatchInit: class {
        constructor(rootDir, options) {
        }
        run() {}
      }
    });

    mockery.registerMock(child_process, {
      execSync: () => {
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
      output.includes('New version is available [31m1.1.2[39m -> [32m1.0.2[39m. Run: [32mnpm init nightwatch@latest[39m to upgrade'),
      true
    );
  });
});
