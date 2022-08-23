import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import colors from 'ansi-colors';
import {prompt} from 'inquirer';
import {NightwatchInit} from './init';
import {NIGHTWATCH_TITLE, AVAILABLE_CONFIG_FLAGS} from './constants';
import Logger from './logger';
import {isNodeProject} from './utils';
import minimist from 'minimist';
import suggestSimilarOption from './utils/suggestSimilar';
import axios from 'axios';

export const run = async () => {
  try {
    const argv = process.argv.slice(2);
    const {_: args, ...options} = minimist(argv, {
      boolean: 'generate-config',
      alias: {
        yes: 'y',
        browser: 'b'
      }
    });

    // If string, convert options.browser to array.
    if (typeof options.browser === 'string') {
      options.browser = [options.browser];
    }

    // Filter flags that are not present in AVAILABLE_CONFIG_ARGS
    const wrongUserFlags = Object.keys(options).filter((word) => !AVAILABLE_CONFIG_FLAGS.includes(word));

    if (wrongUserFlags.length > 0) {
      const findAndSuggestSimilarOption = suggestSimilarOption(wrongUserFlags[0], AVAILABLE_CONFIG_FLAGS);
      if (findAndSuggestSimilarOption !== '') {
        Logger.error(`error: unknown option '${wrongUserFlags[0]}'${findAndSuggestSimilarOption}`);
  
        return;
      }
    }

    Logger.error(NIGHTWATCH_TITLE);
    await checkCreateNightwatchVersion();

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

export const getLatestVersion  = (): Promise<string | void> =>  {

  return axios.get('https://registry.npmjs.org/create-nightwatch')
    .then(({data}: any) => {
      return data['dist-tags'].latest;
    })
    .catch(() => null);
};


export const checkCreateNightwatchVersion = async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {version} = require('../package.json');
  const latestVersion = await getLatestVersion();

  if (latestVersion && latestVersion !== version) {
    Logger.error(`New version is available ${colors.red(version)} -> ${colors.green(latestVersion)}. Run: ${colors.green('npm init nightwatch@latest')} to upgrade\n\n`);
  }
};