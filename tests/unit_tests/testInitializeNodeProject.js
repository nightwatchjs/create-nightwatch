const assert = require('assert');
const mockery = require('mockery');


describe('test initializeNodeProject', () => {
  beforeEach(() => {
    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
  });

  test('when rootDir exists', () => {
    const consoleOutput = [];
    mockery.registerMock(
      './logger',
      class {
        static error(...msgs) {
          consoleOutput.push(...msgs);
        }
      }
    );

    let newDirCreated = false;
    mockery.registerMock('fs', {
      existsSync() {
        return true;
      },
      mkdirSync() {
        newDirCreated = true;
      }
    });

    let commandExecuted;
    let execStdio;
    let execCwd;
    mockery.registerMock('child_process', {
      execSync(command, options) {
        commandExecuted = command;
        execStdio = options.stdio;
        execCwd = options.cwd;
      }
    });

    const index = require('../../lib/index');
    const rootDir = 'someDirPath';
    index.initializeNodeProject(rootDir);

    // Check new project created recursively
    assert.strictEqual(newDirCreated, false);

    // assert npm init command exec
    assert.strictEqual(commandExecuted, 'npm init -y');
    assert.strictEqual(execStdio, 'inherit');
    assert.strictEqual(execCwd, rootDir);

    // Check console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Initializing a new NPM project'), true);
  });

  test('when rootDir does not exists', () => {
    const rootDir = 'someDirPath';

    const consoleOutput = [];
    mockery.registerMock(
      './logger',
      class {
        static error(...msgs) {
          consoleOutput.push(...msgs);
        }
      }
    );

    let newDirCreatedRecursively = false;
    mockery.registerMock('fs', {
      existsSync() {
        return false;
      },
      mkdirSync(path, options) {
        if (path === rootDir && options.recursive) {
          newDirCreatedRecursively = true;
        }
      }
    });

    let commandExecuted;
    let execStdio;
    let execCwd;
    mockery.registerMock('child_process', {
      execSync(command, options) {
        commandExecuted = command;
        execStdio = options.stdio;
        execCwd = options.cwd;
      }
    });

    const index = require('../../lib/index');
    index.initializeNodeProject(rootDir);

    // Check new project created recursively
    assert.strictEqual(newDirCreatedRecursively, true);

    // assert npm init command exec
    assert.strictEqual(commandExecuted, 'npm init -y');
    assert.strictEqual(execStdio, 'inherit');
    assert.strictEqual(execCwd, rootDir);

    // Check console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Initializing a new NPM project'), true);
  });
});