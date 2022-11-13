const assert = require('assert');
const mockery = require('mockery');

function mockLoger(consoleOutput) {
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

describe('test initializeNodeProject', function () {
  beforeEach(function () {
    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
  });

  afterEach(function () {
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
  });

  it('when rootDir exists', function () {
    const consoleOutput = [];
    mockLoger(consoleOutput);

    let newDirCreated = false;
    mockery.registerMock('node:fs', {
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

  it('when rootDir does not exists', function () {
    const rootDir = 'someDirPath';

    const consoleOutput = [];
    mockLoger(consoleOutput);

    let newDirCreatedRecursively = false;
    mockery.registerMock('node:fs', {
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