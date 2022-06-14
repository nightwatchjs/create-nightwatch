import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import colors from 'ansi-colors';
import {prompt} from 'inquirer';
import {NightwatchInit} from './init';
import {NIGHTWATCH_TITLE, AVAILABLE_CONFIG_ARGS} from './constants';
import Logger from './logger';
import {isNodeProject} from './utils';
import minimist from 'minimist';
import suggestSimilar from './utils/suggestSimilar';

export const run = async () => {
  try {
    const argv = process.argv.slice(2);
    const args = argv.filter((arg) => !arg.startsWith('-'));
    const options = minimist(argv);

    // Checking Valid options passed to CLI
    const userOptions = Object.keys(options).slice(1);
    for (const option of userOptions) {
      const checkForSuggestion = suggestSimilar(option, AVAILABLE_CONFIG_ARGS);
      if (checkForSuggestion !== '') {
        Logger.error(`error: unknown option '${option}'${checkForSuggestion}`);

        return;
      }
    }

    Logger.error(NIGHTWATCH_TITLE);

    let rootDir = path.resolve(process.cwd(), args[0] || '');

    if (options?.['generate-config'] && !isNodeProject(rootDir)) {
      throw new Error(`package.json not found. Please run this command from your existing Nightwatch project.
      Or, use \`npm init nightwatch ${args[0] || '.'}\` to initialize a new Nightwatch project instead.`);
    }

    if (!args[0] && !isNodeProject(rootDir) && fs.readdirSync(rootDir).length) {
      // `npm init nightwatch` is used and the cwd is not a node project
      // but contains some files (might be a mistake)
      rootDir = await confirmRootDir(rootDir);
    }

    if (!isNodeProject(rootDir)) {
      initializeNodeProject(rootDir);
    }

    const nightwatchInit = new NightwatchInit(rootDir, options);
    await nightwatchInit.run();
  } catch (err) {
    Logger.error(err as string);
    process.exit(1);
  }
};

export const confirmRootDir = async (rootDir: string): Promise<string> => {
  Logger.error(`${colors.yellow('Warning:')} Current working directory is not a node project and contains some files.`);

  const answers = await prompt([
    {
      type: 'list',
      name: 'confirm',
      message: 'Do you wish to initialize your Nightwatch project here?',
      choices: [
        {name: 'Yes', value: true},
        {name: 'No', value: false}
      ],
      default: false
    },
    {
      type: 'input',
      name: 'newRoot',
      message: 'Relative/absolute path to your existing/new project\'s root directory?',
      default: '.',
      when: (answers) => !answers.confirm
    }
  ]);
  // Insert a blank line after prompt.
  Logger.error();

  if (answers.confirm) {
    return rootDir;
  } else {
    return path.resolve(rootDir, answers.newRoot);
  }
};

export const initializeNodeProject = (rootDir: string) => {
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, {recursive: true});
  }

  Logger.error(`${colors.yellow('package.json')} not found in the root directory. Initializing a new NPM project..\n`);

  execSync('npm init -y', {
    stdio: 'inherit',
    cwd: rootDir
  });
};
