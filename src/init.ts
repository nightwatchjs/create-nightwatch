import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import colors from 'ansi-colors';
import {prompt} from 'inquirer';
import {execSync} from 'child_process';
import { copy, stripControlChars, symbols} from './utils';

import {CONFIG_INTRO, BROWSER_CHOICES, QUESTIONAIRRE, CONFIG_DEST_QUES} from './constants';
import defaultAnswers from './defaults.json';

export default class NightwatchInit {
  rootDir: string;
  options: string[];
  otherInfo: OtherInfo;

  constructor(rootDir = process.cwd(), options: string[]) {
    this.rootDir = rootDir;
    this.options = options;
    this.otherInfo = {};
  }

  async run() {
    let answers: ConfigGeneratorAnswers = {};

    if (this.options.includes('yes')) {
      answers = defaultAnswers as ConfigGeneratorAnswers;
    } else {
      console.error(CONFIG_INTRO);

      let onlyConfig: boolean = false;
      if (this.options.includes('generate-config')) {
        onlyConfig = true;
      }

      answers = await this.askQuestions(onlyConfig);
      // Add a newline after questions.
      console.error();

      // this.mergeWithDefaults(answers);
    }

    this.refineAnswers(answers);

    // Install Packages
    const packagesToInstall = this.identifyPackagesToInstall(answers);
    this.installPackages(packagesToInstall);

    // Setup TypeScript
    if (answers.language === 'ts') this.setupTypescript();

    // Generate configuration file
    const configDestLocation = await this.getConfigDestLocation();
    this.generateConfig(answers, configDestLocation);
  
    // Install/enable webdrivers
    const webdriversToInstall = this.identifyWebdriversToInstall(answers);
    await this.installWebdrivers(webdriversToInstall);

    // Create tests location and copy example files
    if (answers.testsLocation) {this.createTestLocation(answers.testsLocation)}
    if (answers.examplesLocation) {
      this.copyExamples(answers.examplesLocation, answers.language === 'ts', answers.runner || '');
    }

    // Post instructions to run their first test
    this.postSetupInstructions(answers);
  }

  async askQuestions(onlyConfig: boolean) {
    const answers = {
      rootDir: this.rootDir,
      onlyConfig
    };

    return await prompt(QUESTIONAIRRE, answers);
  }

  refineAnswers(answers: ConfigGeneratorAnswers) {
    if (answers.browserstack) {
      answers.remoteName = 'browserstack';
    } else {
      answers.remoteName = 'remote';
    }

    if (!answers.browsers) {
      answers.browsers = BROWSER_CHOICES.map((browser) => browser.value);
    }

    if (!answers.remoteBrowsers) {
      answers.remoteBrowsers = answers.browsers;
    }

    if (process.platform !== 'darwin') {
      answers.browsers.filter((browser) => browser !== 'safari');
    }

    if (!answers.defaultBrowser) {
      answers.defaultBrowser = answers.browsers ? answers.browsers[0] : undefined;
    }

    if (answers.addExamples && !answers.examplesLocation) {
      answers.examplesLocation = path.join(answers.testsLocation || '', 'nightwatch-examples');
    }
  }

  // mergeWithDefaults(answers: ConfigGeneratorAnswers) {
  //   // iterate over all the defaults and if it is not present in
  //   // answers, implement it.
  // }

  identifyPackagesToInstall(answers: ConfigGeneratorAnswers): string[] {
    const packages: string[] = ['nightwatch'];

    if (answers.language === 'ts') {
      packages.push('typescript', '@types/nightwatch');
    }

    if (answers.runner === "cucumber") {
      packages.push('@cucumber/cucumber');
    }

    return packages;
  }

  installPackages(packagesToInstall: string[]): void {
    console.error('Installing the following packages:');
    for (const pack of packagesToInstall) {
      console.error(`- ${pack}`);
    }
    console.error();

    const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf-8'));

    for (const pack of packagesToInstall) {
      console.error(`Installing ${colors.green(pack)}`);

      if (packageJson.devDependencies?.hasOwnProperty(pack) || packageJson.dependencies?.hasOwnProperty(pack)) {
        console.error(colors.green('Already installed!'), '\n');
      } else {
        try {
          execSync(`npm install ${pack} --save-dev`, {
            stdio: ['inherit', 'pipe', 'inherit'],
            cwd: this.rootDir
          });
          console.error(colors.green('Done!'), '\n');
        } catch (err) {
          console.error(`Failed to install ${pack}. Please run \'npm install ${pack} --save-dev\' later.\n`);
        }
      }
    }
  }

  setupTypescript() {
    const tsConfigPath = path.join(this.rootDir, 'tsconfig.json');
    const packageJsonPath = path.join(this.rootDir, 'package.json');

    if (!fs.existsSync(tsConfigPath)) {
      const sampleTsConfigPath = path.join(__dirname, '..', 'assets', 'tsconfig.json');
      const destPath = path.join(this.rootDir, 'tsconfig.json');
      fs.copyFileSync(sampleTsConfigPath, destPath);
    }

    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
    this.otherInfo.tsOutDir = tsConfig.compilerOptions.outDir || '';

    // Add script to run nightwatch tests
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (!packageJson.scripts)
      packageJson.scripts = {};
    if (packageJson.scripts['test']?.includes('no test specified'))
      delete packageJson.scripts['test'];

    if (packageJson.scripts.hasOwnProperty('test')) this.otherInfo.tsTestScript = 'test';
    else this.otherInfo.tsTestScript = 'nightwatch:test';
    packageJson.scripts[this.otherInfo.tsTestScript] = "tsc && nightwatch";

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  async getConfigDestLocation() {
    if (this.options.includes('yes')) {
      console.error('Auto-generating a configuration file...\n');
    } else {
      console.error('Generting a configuration file based on your responses...\n');
    }

    const destFileName = path.join(this.rootDir, 'nightwatch.conf.js');

    if (fs.existsSync(destFileName)) {
      console.error(colors.yellow(`There seems to be another config file located at "${destFileName}".\n`));

      const answers: ConfigDestination = await prompt(CONFIG_DEST_QUES, {rootDir: this.rootDir});
      // Adding a newline after questions.
      console.error();

      if (!answers.overwrite) {return path.join(this.rootDir, `${answers.newFileName}.conf.js`)}
    }

    return destFileName;
  }

  generateConfig(answers: ConfigGeneratorAnswers, configDestLocation: string) {
    const templateFile = path.join(__dirname, '..', 'src', 'config', 'main.ejs');
    // const templateFile = path.join(__dirname, '../runner/cli/nightwatch.conf.ejs');

    const src_folders: string[] = [];

    let testsJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.testsLocation || '');
    if (testsJsSrc !== ".") {
      src_folders.push(testsJsSrc);
      this.otherInfo.testsJsSrc = testsJsSrc;
    }

    if (answers.addExamples) {
      let examplesJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.examplesLocation || '');
      if (examplesJsSrc && testsJsSrc && !examplesJsSrc.startsWith(testsJsSrc)) {
        src_folders.push(examplesJsSrc);
      }
      this.otherInfo.examplesJsSrc = examplesJsSrc;
    }

    const tplData = fs.readFileSync(templateFile).toString();

    let rendered = ejs.render(tplData, {
      plugins: false,
      src_folders: JSON.stringify(src_folders),
      answers
    });

    rendered = stripControlChars(rendered);

    try {
      fs.writeFileSync(configDestLocation, rendered, {encoding: 'utf-8'});

      const configFileName = configDestLocation.split(path.sep).at(-1);
      console.error(`${colors.green(symbols().ok + ' Success!')} Configuration file generated at: "${configDestLocation}".`);

      if (configFileName !== 'nightwatch.conf.js') {
        console.error(`To use this configuration file, run the tests using ${colors.magenta('--config')} flag.`);
      }

      // Add a newline
      console.error();

      return true;
    } catch (err) {
      console.error(err);

      return false;
    }
  }

  // installPackages() {
  //   const requiredPackages = this.requiredPackages();
  //   const packagesToInstall = this.packagesToInstall(requiredPackages);
  // }

  identifyWebdriversToInstall(answers: ConfigGeneratorAnswers): string[] {
    const webdrivers: string[] = [];

    if (answers.browsers?.includes('firefox')) webdrivers.push('geckodriver');
    if (answers.browsers?.includes('chrome')) webdrivers.push('chromedriver');
    if (answers.browsers?.includes('safari')) webdrivers.push('safaridriver');

    return webdrivers;
  }

  async installWebdrivers(webdriversToInstall: string[]) {
    console.error('Installing/enabling the following webdrivers:');
    for (const webdriver of webdriversToInstall) {
      console.error(`- ${webdriver}`);
    }
    console.error();

    if (webdriversToInstall.includes('geckodriver')) {
      console.error('Installing webdriver for Firefox (geckodriver)...');
      try {
        execSync('npm install geckodriver --save-dev', {
          stdio: ['inherit', 'pipe', 'inherit'],
          cwd: this.rootDir
        });
        console.error(colors.green('Done!'), '\n');
      } catch (err) {
        console.error('Failed to install geckodriver. Please run \'npm install geckodriver --save-dev\' later.\n');
      }
    }

    if (webdriversToInstall.includes('chromedriver')) {
      console.error('Installing webdriver for Chrome (chromedriver)...');
      try {
        execSync('npm install chromedriver --save-dev', {
          stdio: ['inherit', 'pipe', 'inherit'],
          cwd: this.rootDir
        });
        console.error(colors.green('Done!'), '\n');
      } catch (err) {
        console.error('Failed to install chromedriver. Please run \'npm install chromedriver --save-dev\' later.\n');
      }
    }

    if (webdriversToInstall.includes('safaridriver')) {
      // console.error("Enabling Safari Webdriver...");
      try {
        // console.error('Enabling safaridriver requires you to enter your sudo password.');
        // console.error('If you don\'t have that now, you can enable safaridriver later.\n');
        const answers = await prompt([
          {
            type: 'list',
            name: 'safaridriver',
            message: 'Enable safaridriver (requires sudo password)?',
            choices: [
              {name: 'Yes', value: true},
              {name: 'No, I\'ll do that later.', value: false}
            ],
            default: 1
          }
        ]);
        // console.error();

        if (answers.safaridriver) {
          console.error('\nEnabling safaridriver...');
          execSync('sudo safaridriver --enable', {
            stdio: ['inherit', 'pipe', 'inherit'],
            cwd: this.rootDir
          });
          console.error(colors.green('Done!'), '\n');
        } else {
          console.error('Please run \'sudo safaridriver --enable\' command to enable safaridriver later.\n');
        }
      } catch (err) {
        console.error('Failed to enable safaridriver. Please run \'sudo safaridriver --enable\' later.\n');
      }
    }
  }

  createTestLocation(testsLocation: string) {
    try {
      fs.mkdirSync(path.join(this.rootDir, testsLocation), {recursive: true});
      // console.error(`Successfully created a new test specs directory at: '${testsLocation}'\n`);
    } catch (err) {
      // console.error('Failed to create the test specs directory. Please create it by yourself.');
    }
  }

  copyExamples(examplesLocation: string, typescript: boolean, test_runner: string) {
    console.error('Generating example files...');

    if (fs.existsSync(path.join(this.rootDir, examplesLocation))) {
      console.error(`Examples already exists at '${examplesLocation}'. Skipping...`);
      return;
    }

    let examplesSrcPath: string;
    if (typescript) {
      examplesSrcPath = path.join(__dirname, '..', 'assets', 'ts-examples');
    } else {
      const nightwatchModulePath = path.dirname(require.resolve('nightwatch/package.json', {paths: [this.rootDir]}));
      examplesSrcPath = path.join(nightwatchModulePath, 'examples');
    }
    
    const examplesDestPath = path.join(this.rootDir, examplesLocation);
    fs.mkdirSync(examplesDestPath, {recursive: true});

    const excludeDir: string[] = [];
    if (test_runner !== 'cucumber') excludeDir.push('cucumber-js');

    copy(examplesSrcPath, examplesDestPath, excludeDir);

    console.error(`${colors.green(symbols().ok + ' Success!')} Generated the example files at '${examplesLocation}'.\n`);
  }

  postSetupInstructions(answers: ConfigGeneratorAnswers) {
    console.error('Nightwatch setup complete!!\n');

    if (this.rootDir !== process.cwd()) {
      console.error('First, change directory to the root dir of your project:');
      console.error(colors.cyan(`  cd ${path.relative(process.cwd(), this.rootDir) || '.'}`), '\n');
    }

    if (answers.addExamples) {
      if (answers.language === 'ts') {
        console.error('To run all examples, run:');
        console.error(colors.cyan(`  npm run ${this.otherInfo.tsTestScript}\n`));

        console.error('To run a single example (github.ts), run:');
        console.error(colors.cyan(`  npm run ${this.otherInfo.tsTestScript} -- ./${this.otherInfo.examplesJsSrc}/github.js\n`));
      } else {
        console.error('To run all examples, run:');
        console.error(colors.cyan(`  npx nightwatch ./${this.otherInfo.examplesJsSrc}\n`));

        console.error('To run a single example (ecosia.js), run:');
        console.error(colors.cyan(`  npx nightwatch ./${this.otherInfo.examplesJsSrc}/tests/ecosia.js\n`));
      }
    } else {
      console.error("A few examples are available at 'node_modules/nightwatch/examples'.\n");

      console.error('To run a single example (ecosia.js), try:');
      console.error(colors.cyan('  npx nightwatch node_modules/nightwatch/examples/tests/ecosia.js'), '\n');

      console.error('To run all examples, try:');
      console.error(colors.cyan('  npx nightwatch node_modules/nightwatch/examples'), '\n');
    }
  }
}

