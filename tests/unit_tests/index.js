const assert = require('assert');
const mockery = require('mockery');
const path = require('path');

describe('index tests', () => {
  describe('test run function', () => {
    beforeEach(() => {
      this.originalProcessArgv = process.argv;
      mockery.enable({useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false});
    });

    afterEach(() => {
      process.argv = this.originalProcessArgv;
      mockery.deregisterAll();
      mockery.resetCache();
      mockery.disable();
    });

    test('works with no argument and package.json present', () => {
      process.argv = ['node', 'filename.js'];

      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      mockery.registerMock('./utils', {
        isNodeProject() {
          return true;
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');
      index.run();

      // Check the arguments passed to NightwatchInit
      assert.strictEqual(rootDirPassed, process.cwd());
      assert.deepEqual(optionsPassed, []);
    });

    test('works with no argument, package.json not present, and root dir empty', () => {
      process.argv = ['node', 'filename.js'];

      const consoleOutput = [];
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

      mockery.registerMock('./utils', {
        isNodeProject() {
          return false;
        }
      });

      mockery.registerMock('fs', {
        readdirSync() {
          return [];
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');

      let newNodeProjectInitialized = false;
      let newNodeProjectRootDir;
      index.initializeNodeProject = (rootDir) => {
        newNodeProjectInitialized = true;
        newNodeProjectRootDir = rootDir;
      };

      index.run();

      // Check the arguments passed to NightwatchInit
      assert.strictEqual(rootDirPassed, process.cwd());
      assert.deepEqual(optionsPassed, []);

      // Check if new node project initialized in correct dir
      assert.strictEqual(newNodeProjectInitialized, true);
      assert.strictEqual(newNodeProjectRootDir, process.cwd());
    });

    test('works with no argument, package.json not present, and root dir not empty', async () => {
      process.argv = ['node', 'filename.js'];

      const consoleOutput = [];
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

      mockery.registerMock('./utils', {
        isNodeProject() {
          return false;
        }
      });

      mockery.registerMock('fs', {
        readdirSync() {
          return ['sample.txt'];
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');

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

      // Check the arguments passed to NightwatchInit
      assert.strictEqual(rootDirPassed, process.cwd());
      assert.deepEqual(optionsPassed, []);

      // Check if root dir confirmation prompted
      assert.strictEqual(rootDirConfirmationPrompted, true);

      // Check if new node project initialized in correct dir
      assert.strictEqual(newNodeProjectInitialized, true);
      assert.strictEqual(newNodeProjectRootDir, process.cwd());
    });

    test('works with many arguments, no options, and package.json present', () => {
      process.argv = ['node', 'filename.js', 'new-project', 'some', 'random', 'args'];
      const expectedRootDir = path.join(process.cwd(), 'new-project');

      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      mockery.registerMock('fs', {
        existsSync() {
          return true;
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');
      index.run();

      // Check the arguments passed to NightwatchInit
      assert.strictEqual(rootDirPassed, expectedRootDir);
      assert.deepEqual(optionsPassed, []);
    });

    test('works with many argument, no options, and package.json not present', () => {
      process.argv = ['node', 'filename.js', 'new-project', 'some', 'random', 'args'];
      const expectedRootDir = path.join(process.cwd(), 'new-project');

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
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');

      let newNodeProjectInitialized = false;
      let newNodeProjectRootDir;
      index.initializeNodeProject = (rootDir) => {
        newNodeProjectInitialized = true;
        newNodeProjectRootDir = rootDir;
      };

      index.run();

      // Check the arguments passed to NightwatchInit
      assert.strictEqual(rootDirPassed, expectedRootDir);
      assert.deepEqual(optionsPassed, []);

      // Check if new node project initialized in correct dir
      assert.strictEqual(newNodeProjectInitialized, true);
      assert.strictEqual(newNodeProjectRootDir, expectedRootDir);
    });

    test('works with many arguments, generate-config options, and package.json present', () => {
      process.argv = ['node', 'filename.js', 'new-project', 'random', '--generate-config', 'args'];
      const expectedRootDir = path.join(process.cwd(), 'new-project');

      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      mockery.registerMock('fs', {
        existsSync() {
          return true;
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');
      index.run();

      // Check the arguments passed to NightwatchInit
      assert.strictEqual(rootDirPassed, expectedRootDir);
      assert.deepEqual(optionsPassed, ['generate-config']);
    });

    test('works with many arguments, generate-config options, and package.json not present', () => {
      process.argv = ['node', 'filename.js', 'new-project', 'random', '--generate-config', 'args'];

      const origProcessExit = process.exit;

      let processExitCode;
      process.exit = (code) => {
        processExitCode = code;
      };

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
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');
      index.run();

      // Check the arguments passed to NightwatchInit (it won't be run due to error)
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

    test('works with many arguments, many options, and package.json present', () => {
      process.argv = ['node', 'filename.js', 'new-project', '-y', '--hello', '--there=hi', '-d', '--generate-config'];
      const expectedRootDir = path.join(process.cwd(), 'new-project');

      mockery.registerMock(
        './logger',
        class {
          static error() {}
        }
      );

      mockery.registerMock('fs', {
        existsSync() {
          return true;
        }
      });

      let rootDirPassed;
      let optionsPassed;
      mockery.registerMock('./init', {
        NightwatchInit: class {
          constructor(rootDir, options) {
            rootDirPassed = rootDir;
            optionsPassed = options;
          }
          run() {}
        }
      });

      const index = require('../../lib/index');
      index.run();

      // Check the arguments passed to NightwatchInit
      assert.strictEqual(rootDirPassed, expectedRootDir);
      assert.deepEqual(optionsPassed, ['yes', 'hello', 'there=hi', 'generate-config']);
    });
  });

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
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

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
      mockery.registerMock(
        './logger',
        class {
          static error(...msgs) {
            consoleOutput.push(...msgs);
          }
        }
      );

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
});
