import fs from 'node:fs';
import path from 'path';
import {execSync} from 'child_process';
import colors from 'ansi-colors';
import {prompt} from 'inquirer';
import {NightwatchInitiator} from '@nightwatch/setup-tools';
import {NIGHTWATCH_TITLE, AVAILABLE_CONFIG_FLAGS} from './constants';
import Logger from './logger';
import minimist from 'minimist';
import DidYouMean from 'didyoumean2';
import {isNodeProject} from './utils';
import {CURRENT_VERSION} from './utils/version';
import axios, {AxiosResponse} from 'axios';
import {Packument} from '@npm/types';

export const run = async () => {
  try {
    const argv = process.argv.slice(2);
    const {_: args, ...options} = minimist(argv, {
      boolean: ['generate-config', 'native'],
      alias: {
        yes: 'y',
        browser: 'b',
        native: 'app'
      }
    });

    // If string, convert options.browser to array.
    if (typeof options.browser === 'string') {
      options.browser = [options.browser];
    }

    // Filter flags that are not present in AVAILABLE_CONFIG_ARGS
    const wrongUserFlags = Object.keys(options).filter((word) => !AVAILABLE_CONFIG_FLAGS.includes(word));

    if (wrongUserFlags.length > 0) {
      const findAndSuggestSimilarOption = DidYouMean(wrongUserFlags[0], AVAILABLE_CONFIG_FLAGS);
      const result = `Flag ${colors.red('--'+wrongUserFlags[0])} is not valid, did you mean ${colors.green('--'+findAndSuggestSimilarOption)}`;
      Logger.error(result);

      // Exit Nightwatch setup process
      process.exit(0);
    }

    let rootDir = path.resolve(process.cwd(), args[0] || '');

    Logger.info(NIGHTWATCH_TITLE);
    await checkCreateNightwatchVersion();

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

    const nightwatchInitiator = new NightwatchInitiator(rootDir, options);
    await nightwatchInitiator.run();
  } catch (err) {
    Logger.error(err as string);
    process.exit(1);
  }
};

export const confirmRootDir = async (rootDir: string): Promise<string> => {
  Logger.warn(`${colors.yellow('Warning:')} Current working directory is not a node project and already contains some files.`);

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
  Logger.info();

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

  Logger.info(`${colors.yellow('package.json')} not found in the root directory. Initializing a new NPM project..\n`);

  execSync('npm init -y', {
    stdio: 'inherit',
    cwd: rootDir
  });
};

export const getLatestVersion = async (): Promise<string | undefined | null> => {
  return axios.get('https://registry.npmjs.org/create-nightwatch')
    .then(({data}: AxiosResponse<Packument>) => {
      return data['dist-tags'].latest;
    })
    .catch(() => null);
};


export const checkCreateNightwatchVersion = async () => {
  const latestVersion = await getLatestVersion();
  const currentVersion = CURRENT_VERSION;

  if (latestVersion && currentVersion && latestVersion !== currentVersion) {
    Logger.info(
      `\nWe've updated this onboarding tool: ${colors.red(currentVersion)} -> ${colors.green(
        latestVersion
      )}.\nTo get the latest experience, run: ${colors.green('npm init nightwatch@latest')}\n\n`
    );
  }
};
