import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import colors from 'ansi-colors';
import {NightwatchInit} from './init';
import {NIGHTWATCH_TITLE} from './constants';
import Logger from './logger';

export const run = async () => {
  try {
    const argv = process.argv.slice(2);
    const args = argv.filter(arg => !arg.startsWith('-'));
    const options = getArgOptions(argv);

    Logger.error(NIGHTWATCH_TITLE);

    const rootDir = path.resolve(process.cwd(), args[0] || '');

    if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
      if (options.includes('generate-config')) {
        throw new Error(`package.json not found. Please run this command from your existing Nightwatch project.
        Or, use \`npm init nightwatch ${args[0] || '.'}\` to initialize a new Nightwatch project instead.`);
      }
      initializeNodeProject(rootDir);
    }

    const nightwatchInit = new NightwatchInit(rootDir, options);
    await nightwatchInit.run();
  } catch (err) {
    Logger.error(err as string);
    process.exit(1);
  }
};

const getArgOptions = (argv: string[]): string[] => {
  const options: string[] = [];

  const alias: {[key: string]: string} = {
    'y': 'yes'
  };

  argv.forEach(arg => {
    if (arg.startsWith('--')) {
      options.push(arg.slice(2));
    } else if (arg.startsWith('-') && alias[arg.slice(1)]) {
      options.push(alias[arg.slice(1)]);
    }
  });

  return options;
};

export const initializeNodeProject = (rootDir: string) => {
  if (!fs.existsSync(rootDir)) {fs.mkdirSync(rootDir, {recursive: true})}

  Logger.error(`${colors.yellow('package.json')} not found in the root directory. Initializing a new NPM project..\n`);

  execSync('npm init -y', {
    'stdio': 'inherit',
    'cwd': rootDir
  });
};
