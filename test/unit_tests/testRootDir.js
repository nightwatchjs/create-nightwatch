const path = require('path');
const mockery = require('mockery');
const assert = require('assert');

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

describe('test confirmRootDir', async () => {
  beforeEach(() => {
    mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.resetCache();
    mockery.disable();
  });

  test('when given root dir is confirmed', async () => {
    const consoleOutput = [];
    mockLoger(consoleOutput);

    mockery.registerMock('inquirer', {
      prompt() {
        return {confirm: true};
      }
    });

    const index = require('../../lib/index');
    const rootDirPassed = 'someDirPath';
    const rootDirReturned = await index.confirmRootDir(rootDirPassed);

    // Check root dir not modified
    assert.strictEqual(rootDirReturned, rootDirPassed);

    // Check console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Current working directory is not a node project'), true);
  });

  test('when given root dir is not confirmed and new path is provided', async () => {
    const consoleOutput = [];
    mockLoger(consoleOutput);

    mockery.registerMock('inquirer', {
      prompt() {
        return {confirm: false, newRoot: 'new-project'};
      }
    });

    const index = require('../../lib/index');
    const rootDirPassed = 'someDirPath';
    const rootDirReturned = await index.confirmRootDir(rootDirPassed);

    // Check root dir not modified
    assert.notStrictEqual(rootDirReturned, rootDirPassed);
    assert.strictEqual(rootDirReturned, path.resolve(rootDirPassed, 'new-project'));

    // Check console output
    const output = consoleOutput.toString();
    assert.strictEqual(output.includes('Current working directory is not a node project'), true);
  });
});