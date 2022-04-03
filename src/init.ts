import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import colors from 'ansi-colors';
import {prompt} from 'inquirer';
import {execSync} from 'child_process';
import {copy, stripControlChars, symbols} from './utils';
import Logger from './logger';

import {CONFIG_INTRO, BROWSER_CHOICES, QUESTIONAIRRE, CONFIG_DEST_QUES} from './constants';
import { ConfigGeneratorAnswers, ConfigDestination, OtherInfo } from './interfaces';
import defaultAnswers from './defaults.json';

export class NightwatchInit {
  rootDir: string;
  options: string[];
  otherInfo: OtherInfo;
  onlyConfig: boolean;

  constructor(rootDir = process.cwd(), options: string[]) {
    this.rootDir = rootDir;
    this.options = options;
    this.otherInfo = {};
    this.onlyConfig = false;
  }

  async run() {
    let answers: ConfigGeneratorAnswers = {};

    if (this.options.includes('generate-config')) {
      this.onlyConfig = true;
    }

    if (this.options.includes('yes')) {
      answers = defaultAnswers as ConfigGeneratorAnswers;
    } else {
      Logger.error(CONFIG_INTRO);

      answers = await this.askQuestions();
      // Add a newline after questions.
      Logger.error();

      // this.mergeWithDefaults(answers);
    }

    this.refineAnswers(answers);

    // Install Packages
    const packagesToInstall = this.identifyPackagesToInstall(answers);
    this.installPackages(packagesToInstall);

    // Setup TypeScript
    if (!this.onlyConfig && answers.language === 'ts') {this.setupTypescript()}

    // Check if Java is installed on the system
    if (answers.seleniumServer) {this.checkJavaInstallation()}

    // Generate configuration file
    const configDestLocation = await this.getConfigDestLocation();
    this.generateConfig(answers, configDestLocation);

    // Install/enable webdrivers
    const webdriversToInstall = this.identifyWebdriversToInstall(answers);
    await this.installWebdrivers(webdriversToInstall);

    if (!this.onlyConfig) {
      // Create tests location
      if (answers.testsLocation) {this.createTestLocation(answers.testsLocation)}

      // Copy examples
      // For cucumber, only copy the cucumber examples.
      // For rest, copy all examples but cucumber.
      if (answers.runner === 'cucumber') {
        this.copyCucumberExamples(answers.examplesLocation || '');
      } else if (answers.addExamples) {
        this.copyExamples(answers.examplesLocation || '', answers.language === 'ts', answers.runner || '');
      }

      // Post instructions to run their first test
      this.postSetupInstructions(answers);
    } else {
      // Post config instructions
      this.postConfigInstructions(answers);
    }
    
  }

  async askQuestions() {
    const answers = {
      rootDir: this.rootDir,
      onlyConfig: this.onlyConfig
    };

    return await prompt(QUESTIONAIRRE, answers);
  }

  refineAnswers(answers: ConfigGeneratorAnswers) {
    const backendHasRemote = answers.backend && ['remote', 'both'].includes(answers.backend);

    if (backendHasRemote && answers.hostname?.includes('browserstack')) {
      answers.browserstack = true;
    }

    if (answers.browserstack) {
      answers.remoteName = 'browserstack';
    } else if (backendHasRemote) {
      answers.remoteName = 'remote';
    }

    if (!answers.browsers) {
      answers.browsers = BROWSER_CHOICES.map((browser) => browser.value);
    } else if (answers.browsers.includes('selenium-server')) {
      if (!answers.seleniumServer) answers.seleniumServer = true;
      // Remove selenium-server from browsers
      const pos = answers.browsers.indexOf('selenium-server');
      answers.browsers.splice(pos, 1);
    }

    // Enable seleniumServer if ie present in local browsers.
    if (answers.browsers.includes('ie') && !answers.seleniumServer) {
      answers.seleniumServer = true;
    }

    if (!answers.remoteBrowsers && backendHasRemote) {
      answers.remoteBrowsers = answers.browsers;
    }

    if (process.platform !== 'darwin' && answers.browsers.includes('safari')) {
      // Remove safari from browsers from non-mac users
      const pos = answers.browsers.indexOf('safari');
      answers.browsers.splice(pos, 1);
    }

    if (!answers.defaultBrowser) {
      answers.defaultBrowser = answers.browsers ? answers.browsers[0] : undefined;
    }

    // Always generate examples (for now)
    if (!this.onlyConfig) {answers.addExamples = true}

    if (answers.addExamples && !answers.examplesLocation) {
      if (answers.runner === 'cucumber') {
        answers.examplesLocation = path.join(answers.featurePath || '', 'nightwatch-examples');
      } else {
        answers.examplesLocation = path.join(answers.testsLocation || '', 'nightwatch-examples');
      }
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

    if (answers.runner === 'cucumber') {
      packages.push('@cucumber/cucumber');
    }

    if (answers.seleniumServer) {
      packages.push('@nightwatch/selenium-server');
    }

    // Identify packages already installed and don't install them again
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf-8'));

    const packagesToInstall = packages.filter((pack) => {
      // eslint-disable-next-line
      return !packageJson.devDependencies?.hasOwnProperty(pack) && !packageJson.dependencies?.hasOwnProperty(pack);
    });

    return packagesToInstall;
  }

  installPackages(packagesToInstall: string[]): void {
    if (packagesToInstall.length === 0) return;

    Logger.error('Installing the following packages:');
    for (const pack of packagesToInstall) {
      Logger.error(`- ${pack}`);
    }
    Logger.error();

    for (const pack of packagesToInstall) {
      Logger.error(`Installing ${colors.green(pack)}`);

      try {
        execSync(`npm install ${pack} --save-dev`, {
          stdio: ['inherit', 'pipe', 'inherit'],
          cwd: this.rootDir
        });
        Logger.error(colors.green('Done!'), '\n');
      } catch (err) {
        Logger.error(`Failed to install ${pack}. Please run 'npm install ${pack} --save-dev' later.\n`);
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
    this.otherInfo.tsOutDir = tsConfig.compilerOptions?.outDir || '';

    // Add script to run nightwatch tests
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (!packageJson.scripts) {packageJson.scripts = {}}
    if (packageJson.scripts['test']?.includes('no test specified')) {delete packageJson.scripts['test']}

    // eslint-disable-next-line
    if (!packageJson.scripts.hasOwnProperty('test')) {
      this.otherInfo.tsTestScript = 'test';
    } else if (!packageJson.scripts.hasOwnProperty('nightwatch:test')) {
      this.otherInfo.tsTestScript = 'nightwatch:test';
    } else{
      this.otherInfo.tsTestScript = 'nightwatch:test:new';
    }
    packageJson.scripts[this.otherInfo.tsTestScript] = 'tsc && nightwatch';

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  checkJavaInstallation() {
    try {
      execSync('java -version', {
        stdio: 'pipe',
        cwd: this.rootDir
      });
    } catch(err) {
      this.otherInfo.javaNotInstalled = true;
    }
  }

  async getConfigDestLocation() {
    if (this.options.includes('yes')) {
      Logger.error('Auto-generating a configuration file...\n');
    } else {
      Logger.error('Generting a configuration file based on your responses...\n');
    }

    const destFileName = path.join(this.rootDir, 'nightwatch.conf.js');

    if (fs.existsSync(destFileName)) {
      Logger.error(colors.yellow(`There seems to be another config file located at "${destFileName}".\n`));

      const answers: ConfigDestination = await prompt(CONFIG_DEST_QUES, {rootDir: this.rootDir});
      // Adding a newline after questions.
      Logger.error();

      if (!answers.overwrite) {return path.join(this.rootDir, `${answers.newFileName}.conf.js`)}
    }

    return destFileName;
  }

  generateConfig(answers: ConfigGeneratorAnswers, configDestLocation: string) {
    const templateFile = path.join(__dirname, '..', 'src', 'config', 'main.ejs');
    // const templateFile = path.join(__dirname, '../runner/cli/nightwatch.conf.ejs');

    const src_folders: string[] = [];

    const testsJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.testsLocation || '');
    if (testsJsSrc !== '.') {
      src_folders.push(testsJsSrc);
      this.otherInfo.testsJsSrc = testsJsSrc;
    }

    // Add examplesLocation to src_folders, if different from testsLocation.
    // Don't add for cucumber examples (for now, as addition of examples depends upon featurePath in copyCucumberExamples).
    if (answers.addExamples && answers.runner !== 'cucumber') {
      const examplesJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.examplesLocation || '');
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
      Logger.error(`${colors.green(symbols().ok + ' Success!')} Configuration file generated at: "${configDestLocation}".`);

      if (configFileName !== 'nightwatch.conf.js') {
        Logger.error(`To use this configuration file, run the tests using ${colors.magenta('--config')} flag.`);
      }

      // Add a newline
      Logger.error();

      return true;
    } catch (err) {
      Logger.error('Failed to generate Nightwatch config.');
      Logger.error('Please run the init command again, or a config file will be auto-generated when you run your first test.')
      return false;
    }
  }

  // installPackages() {
  //   const requiredPackages = this.requiredPackages();
  //   const packagesToInstall = this.packagesToInstall(requiredPackages);
  // }

  identifyWebdriversToInstall(answers: ConfigGeneratorAnswers): string[] {
    const webdrivers: string[] = [];

    if (answers.browsers?.includes('firefox')) {webdrivers.push('geckodriver')}
    if (answers.browsers?.includes('chrome')) {webdrivers.push('chromedriver')}
    if (answers.browsers?.includes('safari')) {webdrivers.push('safaridriver')}

    return webdrivers;
  }

  async installWebdrivers(webdriversToInstall: string[]) {
    Logger.error('Installing/enabling the following webdrivers:');
    for (const webdriver of webdriversToInstall) {
      Logger.error(`- ${webdriver}`);
    }
    Logger.error();

    if (webdriversToInstall.includes('geckodriver')) {
      Logger.error('Installing webdriver for Firefox (geckodriver)...');
      try {
        execSync('npm install geckodriver --save-dev', {
          stdio: ['inherit', 'pipe', 'inherit'],
          cwd: this.rootDir
        });
        Logger.error(colors.green('Done!'), '\n');
      } catch (err) {
        Logger.error('Failed to install geckodriver. Please run \'npm install geckodriver --save-dev\' later.\n');
      }
    }

    if (webdriversToInstall.includes('chromedriver')) {
      Logger.error('Installing webdriver for Chrome (chromedriver)...');
      try {
        execSync('npm install chromedriver --save-dev', {
          stdio: ['inherit', 'pipe', 'inherit'],
          cwd: this.rootDir
        });
        Logger.error(colors.green('Done!'), '\n');
      } catch (err) {
        Logger.error('Failed to install chromedriver. Please run \'npm install chromedriver --save-dev\' later.\n');
      }
    }

    if (webdriversToInstall.includes('safaridriver')) {
      // Logger.error("Enabling Safari Webdriver...");
      try {
        // Logger.error('Enabling safaridriver requires you to enter your sudo password.');
        // Logger.error('If you don\'t have that now, you can enable safaridriver later.\n');
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
        // Logger.error();

        if (answers.safaridriver) {
          Logger.error();
          Logger.error('Enabling safaridriver...');
          execSync('sudo safaridriver --enable', {
            stdio: ['inherit', 'pipe', 'inherit'],
            cwd: this.rootDir
          });
          Logger.error(colors.green('Done!'), '\n');
        } else {
          Logger.error('Please run \'sudo safaridriver --enable\' command to enable safaridriver later.\n');
        }
      } catch (err) {
        Logger.error('Failed to enable safaridriver. Please run \'sudo safaridriver --enable\' later.\n');
      }
    }
  }

  createTestLocation(testsLocation: string) {
    try {
      fs.mkdirSync(path.join(this.rootDir, testsLocation), {recursive: true});
      // Logger.error(`Successfully created a new test specs directory at: '${testsLocation}'\n`);
    } catch (err) {
      // Logger.error('Failed to create the test specs directory. Please create it by yourself.');
    }
  }

  copyCucumberExamples(examplesLocation: string) {
    // If the featurePath (part of examplesLocation) contains **, no way of knowing where to put
    // example feature files (maybe in the most outside folder by creating a new example dir?)
    // Skipping all paths with '*' for now.
    if (examplesLocation.includes('*')) {return}

    Logger.error('Generating example for CucumberJS...');
    this.otherInfo.cucumberExamplesAdded = true;

    const exampleDestPath = path.join(this.rootDir, examplesLocation);
    if (fs.existsSync(exampleDestPath)) {
      Logger.error(`Example already exists at '${examplesLocation}'. Skipping...`, '\n');

      return;
    }
    fs.mkdirSync(exampleDestPath, {recursive: true});

    const nightwatchModulePath = path.dirname(require.resolve('nightwatch/package.json', {paths: [this.rootDir]}));
    const exampleSrcPath = path.join(nightwatchModulePath, 'examples', 'cucumber-js', 'features');

    copy(exampleSrcPath, exampleDestPath);
    Logger.error(`${colors.green(symbols().ok + ' Success!')} Generated an example for CucumberJS at "${examplesLocation}".\n`);
  }

  copyExamples(examplesLocation: string, typescript: boolean, test_runner: string) {
    Logger.error('Generating example files...');

    if (fs.existsSync(path.join(this.rootDir, examplesLocation))) {
      Logger.error(`Examples already exists at '${examplesLocation}'. Skipping...`, '\n');

      return;
    }

    let examplesSrcPath: string;
    if (typescript) {
      examplesSrcPath = path.join(__dirname, '..', 'assets', 'ts-examples');
    } else {
      // const nightwatchModulePath = path.dirname(require.resolve('nightwatch/package.json', {paths: [this.rootDir]}));
      // examplesSrcPath = path.join(nightwatchModulePath, 'examples');
      examplesSrcPath = path.join(__dirname, '..', 'assets', 'js-examples');
    }

    const examplesDestPath = path.join(this.rootDir, examplesLocation);
    fs.mkdirSync(examplesDestPath, {recursive: true});

    const excludeDir: string[] = [];
    if (test_runner !== 'cucumber') {excludeDir.push('cucumber-js')}

    copy(examplesSrcPath, examplesDestPath, excludeDir);

    Logger.error(`${colors.green(symbols().ok + ' Success!')} Generated some example files at '${examplesLocation}'.\n`);
  }

  postSetupInstructions(answers: ConfigGeneratorAnswers) {
    Logger.error('Nightwatch setup complete!!\n');

    if (this.rootDir !== process.cwd()) {
      Logger.error('First, change directory to the root dir of your project:');
      Logger.error(colors.cyan(`  cd ${path.relative(process.cwd(), this.rootDir) || '.'}`), '\n');
    }

    if (answers.runner === 'cucumber') {
      Logger.error('To run your tests with CucumberJS, simply run:');
      Logger.error(colors.cyan('  npx nightwatch'), '\n');

      if (this.otherInfo.cucumberExamplesAdded) {
        Logger.error('To run an example test with CucumberJS, run:');
        Logger.error(colors.cyan(`  npx nightwatch ${path.join(answers.featurePath || '', 'nightwatch-example')}`), '\n');
      }

      Logger.error('For more details on using CucumberJS with Nightwatch, visit:');
      Logger.error(colors.cyan('  https://nightwatchjs.org/guide/third-party-runners/cucumberjs-nightwatch-integration.html'));

    } else if (answers.addExamples) {
      if (answers.language === 'ts') {
        Logger.error('To run all examples, run:');
        Logger.error(colors.cyan(`  npm run ${this.otherInfo.tsTestScript}\n`));

        Logger.error('To run a single example (github.ts), run:');
        Logger.error(colors.cyan(`  npm run ${this.otherInfo.tsTestScript} -- ./${this.otherInfo.examplesJsSrc}/github.js\n`));
      } else {
        Logger.error('To run all examples, run:');
        Logger.error(colors.cyan(`  npx nightwatch ./${this.otherInfo.examplesJsSrc}\n`));

        Logger.error('To run a single example (ecosia.js), run:');
        Logger.error(colors.cyan(`  npx nightwatch ./${this.otherInfo.examplesJsSrc}/ecosia.js\n`));
      }
    } else {
      Logger.error('A few examples are available at \'node_modules/nightwatch/examples\'.\n');

      Logger.error('To run a single example (ecosia.js), try:');
      Logger.error(colors.cyan('  npx nightwatch node_modules/nightwatch/examples/tests/ecosia.js'), '\n');

      Logger.error('To run all examples, try:');
      Logger.error(colors.cyan('  npx nightwatch node_modules/nightwatch/examples'), '\n');
    }

    if (answers.seleniumServer) {
      Logger.error('[Selenium Server]\n');
      if (this.otherInfo.javaNotInstalled) {
        // Logger.error('It seems like Java is not installed on your system.');
        Logger.error('Java Development Kit (minimum v7) is required to run selenium-server locally. Download from here:');
        Logger.error(colors.cyan('  https://www.oracle.com/technetwork/java/javase/downloads/index.html'), '\n');
      }

      if (answers.language === 'ts') {
        Logger.error(`To run tests on your local selenium-server, build your project (${colors.cyan('tsc')}) and then run:`);
        Logger.error(colors.cyan('  npx nightwatch --env selenium_server'), '\n');
        Logger.error('Or, run this command:');
        Logger.error(colors.cyan(`  npm run ${this.otherInfo.tsTestScript} -- --env selenium_server\n`));
      } else {
        Logger.error('To run tests on your local selenium-server, use command:');
        Logger.error(colors.cyan('  npx nightwatch --env selenium_server'), '\n');
      }
    }
  }

  postConfigInstructions(answers: ConfigGeneratorAnswers) {
    if (answers.seleniumServer && this.otherInfo.javaNotInstalled) {
      Logger.error('Java Development Kit (minimum v7) is required to run selenium-server locally. Download from here:');
      Logger.error(colors.cyan('  https://www.oracle.com/technetwork/java/javase/downloads/index.html'), '\n');
    }

    if (answers.language === 'ts') {
      Logger.error(`Since you are using TypeScript, please verify ${colors.magenta('src_folders')} once in your newly generated config file.`);
      Logger.error('It should point to the location of your transpiled test files.\n');
    }

    Logger.error('Happy Testing!!!');
  }
}

