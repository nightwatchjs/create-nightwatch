import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import colors from 'ansi-colors';
import {prompt} from 'inquirer';
import {execSync} from 'child_process';
import {copy, stripControlChars, symbols} from './utils';
import Logger from './logger';

import {CONFIG_INTRO, BROWSER_CHOICES, QUESTIONAIRRE, CONFIG_DEST_QUES} from './constants';
import {ConfigGeneratorAnswers, ConfigDestination, OtherInfo} from './interfaces';
import defaultAnswers from './defaults.json';
import {ParsedArgs} from 'minimist';

export class NightwatchInit {
  rootDir: string;
  options: Omit<ParsedArgs, '_'>;
  otherInfo: OtherInfo;
  onlyConfig: boolean;

  constructor(rootDir = process.cwd(), options: Omit<ParsedArgs, '_'>) {
    this.rootDir = rootDir;
    this.options = options;
    this.otherInfo = {};
    this.onlyConfig = false;
  }

  async run() {
    let answers: ConfigGeneratorAnswers = {};

    if (this.options?.['generate-config']) {
      this.onlyConfig = true;
    }

    if (this.options?.yes) {
      if (this.options?.browser) {
        defaultAnswers.browsers = this.options.browser;
        answers = defaultAnswers as ConfigGeneratorAnswers;
      } else {
        answers = defaultAnswers as ConfigGeneratorAnswers;
      }
    } else {
      Logger.error(CONFIG_INTRO);

      answers = await this.askQuestions();
      // Add a newline after questions.
      Logger.error();
    }

    this.refineAnswers(answers);

    // Install Packages
    const packagesToInstall = this.identifyPackagesToInstall(answers);
    this.installPackages(packagesToInstall);

    // Setup TypeScript
    if (!this.onlyConfig && answers.language === 'ts') {
      this.setupTypescript();
    }

    // Check if Java is installed on the system
    if (answers.seleniumServer) {
      this.checkJavaInstallation();
    }

    // Generate configuration file
    const configDestPath = await this.getConfigDestPath();
    this.generateConfig(answers, configDestPath);

    // Install/Update webdrivers
    const webdriversToInstall = this.identifyWebdriversToInstall(answers);
    await this.installWebdrivers(webdriversToInstall);

    if (!this.onlyConfig) {
      // Create tests location
      if (answers.testsLocation) {
        this.createTestLocation(answers.testsLocation);
      }

      // Copy examples
      // For cucumber, only copy the cucumber examples.
      // For rest, copy all examples but cucumber.
      if (answers.runner === 'cucumber') {
        this.copyCucumberExamples(answers.examplesLocation || '');
      } else if (answers.addExamples) {
        this.copyExamples(answers.examplesLocation || '', answers.language === 'ts');
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
      onlyConfig: this.onlyConfig,
      browsers: this.options?.browser
    };

    return await prompt(QUESTIONAIRRE, answers);
  }

  refineAnswers(answers: ConfigGeneratorAnswers) {
    const backendHasLocal = answers.backend && ['local', 'both'].includes(answers.backend);
    const backendHasRemote = answers.backend && ['remote', 'both'].includes(answers.backend);

    if (backendHasRemote) {
      if (answers.hostname?.includes('browserstack')) {
        answers.browserstack = true;
      }

      if (answers.browserstack) {
        answers.remoteName = 'browserstack';
      } else {
        answers.remoteName = 'remote';
      }

      if (!answers.remoteBrowsers) {
        if (answers.browsers) {
          // Copy all browsers, except selenium-server (if present)
          answers.remoteBrowsers = [...answers.browsers].filter((browser) => browser !== 'selenium-server');
        } else {
          answers.remoteBrowsers = BROWSER_CHOICES.map((browser) => browser.value);
        }
      }

      // If backend is only remote (no local), delete answers.browsers (if present)
      // and set the defaultBrowser.
      if (!backendHasLocal) {
        if (answers.browsers) {
          delete answers.browsers;
        }
        answers.defaultBrowser = answers.remoteBrowsers[0];
      }
    }

    if (backendHasLocal) {
      if (!answers.browsers) {
        answers.browsers = BROWSER_CHOICES.map((browser) => browser.value);
      }

      if (answers.browsers.includes('selenium-server')) {
        if (!answers.seleniumServer) {
          answers.seleniumServer = true;
        }
        // Remove selenium-server from browsers
        const pos = answers.browsers.indexOf('selenium-server');
        answers.browsers.splice(pos, 1);
      }

      // Enable seleniumServer if ie present in local browsers.
      if (answers.browsers.includes('ie') && !answers.seleniumServer) {
        answers.seleniumServer = true;
      }

      // Remove safari from answers.browsers from non-mac users
      if (process.platform !== 'darwin' && answers.browsers.includes('safari')) {
        const pos = answers.browsers.indexOf('safari');
        answers.browsers.splice(pos, 1);
      }

      // Set defaultBrowser
      if (!answers.defaultBrowser) {
        answers.defaultBrowser = answers.browsers[0];
      }
    }

    // Always generate examples (for now)
    if (!this.onlyConfig) {
      answers.addExamples = true;
    }

    // Set testsLocation to default if not present
    if (!answers.testsLocation) {
      answers.testsLocation = defaultAnswers.testsLocation;
    }

    if (answers.addExamples && !answers.examplesLocation) {
      if (answers.runner === 'cucumber') {
        answers.examplesLocation = path.join(answers.featurePath || '', 'nightwatch-examples');
      } else {
        // Put examples directly into testsLocation, to be used as boilerplate.
        answers.examplesLocation = answers.testsLocation;
        
        // But if the chosen examplesLocation already contains some files, shift the examples
        // to a sub-folder named 'nightwatch-examples'.
        const examplesDestPath = path.join(this.rootDir, answers.examplesLocation);
        if (fs.existsSync(examplesDestPath) && fs.readdirSync(examplesDestPath).length) {
          answers.examplesLocation = path.join(answers.examplesLocation, 'nightwatch-examples');
        }
      }
    }
  }

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
    if (packagesToInstall.length === 0) {
      return;
    }

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

    // Generate a new tsconfig.json file if not already present.
    if (!fs.existsSync(tsConfigPath)) {
      const sampleTsConfigPath = path.join(__dirname, '..', 'assets', 'tsconfig.json');
      const destPath = path.join(this.rootDir, 'tsconfig.json');
      fs.copyFileSync(sampleTsConfigPath, destPath);
    }

    // Read outDir property from tsconfig.json file.
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
    this.otherInfo.tsOutDir = tsConfig.compilerOptions?.outDir || '';

    // Add script to run nightwatch tests
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    if (packageJson.scripts['test']?.includes('no test specified')) {
      delete packageJson.scripts['test'];
    }

    // eslint-disable-next-line
    if (!packageJson.scripts.hasOwnProperty('test')) {
      this.otherInfo.tsTestScript = 'test';
      // eslint-disable-next-line
    } else if (!packageJson.scripts.hasOwnProperty('nightwatch:test')) {
      this.otherInfo.tsTestScript = 'nightwatch:test';
    } else {
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
    } catch (err) {
      this.otherInfo.javaNotInstalled = true;
    }
  }

  async getConfigDestPath() {
    if (this.options?.yes) {
      Logger.error('Auto-generating a configuration file...\n');
    } else {
      Logger.error('Generting a configuration file based on your responses...\n');
    }

    const configDestPath = path.join(this.rootDir, 'nightwatch.conf.js');

    if (fs.existsSync(configDestPath)) {
      Logger.error(colors.yellow(`There seems to be another config file located at "${configDestPath}".\n`));

      const answers: ConfigDestination = await prompt(CONFIG_DEST_QUES, {rootDir: this.rootDir});
      // Adding a newline after questions.
      Logger.error();

      if (!answers.overwrite) {
        const configFileName = `${answers.newFileName}.conf.js`;
        this.otherInfo.nonDefaultConfigName = configFileName;

        return path.join(this.rootDir, configFileName);
      }
    }

    return configDestPath;
  }

  generateConfig(answers: ConfigGeneratorAnswers, configDestPath: string) {
    const templateFile = path.join(__dirname, '..', 'src', 'config', 'main.ejs');

    const src_folders: string[] = []; // to go into the config file as the value of src_folders property.
    const page_objects_path: string[] = []; // to go as the value of page_objects_configs property.
    const custom_commands_path: string[] = []; // to go as the value of custom_commands_path property.

    const testsJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.testsLocation || '');
    if (testsJsSrc !== '.') {
      src_folders.push(testsJsSrc);
      this.otherInfo.testsJsSrc = testsJsSrc;
    }

    if (answers.addExamples && answers.runner !== 'cucumber') {
      // Add examplesLocation to src_folders, if different from testsLocation.
      // Don't add for cucumber examples (for now, as addition of examples depends upon featurePath in copyCucumberExamples).
      const examplesJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.examplesLocation || '');
      if (examplesJsSrc && testsJsSrc && !examplesJsSrc.startsWith(testsJsSrc)) {
        src_folders.push(examplesJsSrc);
      }
      this.otherInfo.examplesJsSrc = examplesJsSrc;

      // Add page_objects_path
      if (answers.language === 'js') {
        // Right now, we only ship page-objects/custom-commands examples 
        // with JS (Nightwatch and Mocha test runner) only.
        page_objects_path.push(`${path.join(examplesJsSrc, 'page-objects')}`);
        custom_commands_path.push(`${path.join(examplesJsSrc, 'custom-commands')}`);
      }
    }

    const tplData = fs.readFileSync(templateFile).toString();

    let rendered = ejs.render(tplData, {
      plugins: false,
      src_folders: JSON.stringify(src_folders).replace(/"/g, '\''),
      page_objects_path: JSON.stringify(page_objects_path).replace(/"/g, '\''),
      custom_commands_path: JSON.stringify(custom_commands_path).replace(/"/g, '\''),
      answers
    });

    rendered = stripControlChars(rendered);

    try {
      fs.writeFileSync(configDestPath, rendered, {encoding: 'utf-8'});

      Logger.error(`${colors.green(symbols().ok + ' Success!')} Configuration file generated at: "${configDestPath}".`);

      if (this.otherInfo.nonDefaultConfigName) {
        Logger.error(`To use this configuration file, run the tests using ${colors.magenta('--config')} flag.`);
      }
      // Add a newline
      Logger.error();

      return true;
    } catch (err) {
      Logger.error('Failed to generate Nightwatch config.');
      Logger.error(
        'Please run the init command again, or a config file will be auto-generated when you run your first test.'
      );

      return false;
    }
  }

  identifyWebdriversToInstall(answers: ConfigGeneratorAnswers): string[] {
    const webdrivers: string[] = [];

    if (answers.browsers?.includes('firefox')) {
      webdrivers.push('geckodriver');
    }
    if (answers.browsers?.includes('chrome')) {
      webdrivers.push('chromedriver');
    }
    if (answers.browsers?.includes('ie')) {
      webdrivers.push('iedriver');
    }
    if (answers.browsers?.includes('safari')) {
      webdrivers.push('safaridriver');
    }

    return webdrivers;
  }

  async installWebdrivers(webdriversToInstall: string[]) {
    Logger.error('Installing/Updating the following webdrivers:');
    for (const webdriver of webdriversToInstall) {
      Logger.error(`- ${webdriver}`);
    }
    Logger.error();

    const driversDownloadedFromNPM: { [key: string]: string } = {
      geckodriver: 'Firefox',
      chromedriver: 'Chrome',
      iedriver: 'IE'
    };

    for (const webdriver of webdriversToInstall) {
      if (webdriver in driversDownloadedFromNPM) {
        Logger.error(`Installing webdriver for ${driversDownloadedFromNPM[webdriver]} (${webdriver})...`);
        try {
          execSync(`npm install ${webdriver} --save-dev`, {
            stdio: ['inherit', 'pipe', 'inherit'],
            cwd: this.rootDir
          });
          Logger.error(colors.green('Done!'), '\n');
        } catch (err) {
          Logger.error(`Failed to install ${webdriver}. Please run 'npm install ${webdriver} --save-dev' later.\n`);
        }
      }
    }

    if (webdriversToInstall.includes('safaridriver')) {
      try {
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
      // eslint-disable-next-line
    } catch (err) {}
  }

  copyCucumberExamples(examplesLocation: string) {
    // If the featurePath (part of examplesLocation) contains **, no way of knowing where to put
    // example feature files (maybe in the most outside folder by creating a new example dir?)
    // Skipping all paths with '*' for now.
    if (examplesLocation.includes('*')) {
      return;
    }

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
    Logger.error(
      `${colors.green(symbols().ok + ' Success!')} Generated an example for CucumberJS at "${examplesLocation}".\n`
    );
  }

  copyExamples(examplesLocation: string, typescript: boolean) {
    Logger.error('Generating example files...');

    const examplesDestPath = path.join(this.rootDir, examplesLocation);  // this is different from this.otherInfo.examplesJsSrc
    try {
      fs.mkdirSync(examplesDestPath, {recursive: true});
      // eslint-disable-next-line
    } catch (err) {}

    if (fs.readdirSync(examplesDestPath).length) {
      Logger.error(`Examples already exists at '${examplesLocation}'. Skipping...`, '\n');

      return;
    }

    let examplesSrcPath: string;
    if (typescript) {
      examplesSrcPath = path.join(__dirname, '..', 'assets', 'ts-examples');
    } else {
      examplesSrcPath = path.join(__dirname, '..', 'assets', 'js-examples-new');
    }

    copy(examplesSrcPath, examplesDestPath);

    Logger.error(
      `${colors.green(symbols().ok + ' Success!')} Generated some example files at '${examplesLocation}'.\n`
    );
  }

  postSetupInstructions(answers: ConfigGeneratorAnswers) {
    Logger.error('Nightwatch setup complete!!\n');

    if (this.rootDir !== process.cwd()) {
      Logger.error('First, change directory to the root dir of your project:');
      Logger.error(colors.cyan(`  cd ${path.relative(process.cwd(), this.rootDir) || '.'}`), '\n');
    }

    let envFlag = '';
    if (answers.backend === 'remote') {
      envFlag = ` --env ${answers.remoteName}`;
    }

    let configFlag = '';
    if (this.otherInfo.nonDefaultConfigName) {
      configFlag = ` --config ${this.otherInfo.nonDefaultConfigName}`;
    }

    let tsExtraDash = '';
    if (envFlag || configFlag) {
      tsExtraDash = ' --';
    }

    if (answers.runner === 'cucumber') {
      Logger.error('To run your tests with CucumberJS, simply run:');
      Logger.error(colors.cyan(`  npx nightwatch${envFlag}${configFlag}`), '\n');

      if (this.otherInfo.cucumberExamplesAdded) {
        Logger.error('To run an example test with CucumberJS, run:');
        Logger.error(colors.cyan(`  npx nightwatch ${answers.examplesLocation}${envFlag}${configFlag}`), '\n');
      }

      Logger.error('For more details on using CucumberJS with Nightwatch, visit:');
      Logger.error(
        colors.cyan('  https://nightwatchjs.org/guide/third-party-runners/cucumberjs-nightwatch-integration.html')
      );
    } else if (answers.addExamples) {
      if (answers.language === 'ts') {
        Logger.error('To run all examples, run:');
        Logger.error(colors.cyan(`  npm run ${this.otherInfo.tsTestScript}${tsExtraDash}${envFlag}${configFlag}\n`));

        Logger.error('To run a single example (github.ts), run:');
        Logger.error(
          colors.cyan(
            `  npm run ${this.otherInfo.tsTestScript} -- .${path.sep}${path.join(
              this.otherInfo.examplesJsSrc || '',
              'github.js'
            )}${envFlag}${configFlag}\n`
          )
        );
      } else {
        Logger.error('To run all examples, run:');
        Logger.error(
          colors.cyan(
            `  npx nightwatch .${path.sep}${path.join(
              this.otherInfo.examplesJsSrc || '',
              'specs'
            )}${envFlag}${configFlag}\n`
          )
        );

        Logger.error('To run a single example (ecosia.js), run:');
        Logger.error(
          colors.cyan(
            `  npx nightwatch .${path.sep}${path.join(
              this.otherInfo.examplesJsSrc || '',
              'specs',
              'basic',
              'ecosia.js'
            )}${envFlag}${configFlag}\n`
          )
        );
      }
    } else {
      Logger.error(`A few examples are available at '${path.join('node_modules', 'nightwatch', 'examples')}'.\n`);

      Logger.error('To run a single example (ecosia.js), try:');
      Logger.error(
        colors.cyan(
          `  npx nightwatch ${path.join(
            'node_modules',
            'nightwatch',
            'examples',
            'tests',
            'ecosia.js'
          )}${envFlag}${configFlag}`
        ),
        '\n'
      );

      Logger.error('To run all examples, try:');
      Logger.error(
        colors.cyan(`  npx nightwatch ${path.join('node_modules', 'nightwatch', 'examples')}${envFlag}${configFlag}`),
        '\n'
      );
    }

    if (answers.seleniumServer) {
      Logger.error('[Selenium Server]\n');
      if (this.otherInfo.javaNotInstalled) {
        Logger.error(
          'Java Development Kit (minimum v7) is required to run selenium-server locally. Download from here:'
        );
        Logger.error(colors.cyan('  https://www.oracle.com/technetwork/java/javase/downloads/index.html'), '\n');
      }

      if (answers.language === 'ts') {
        Logger.error(
          `To run tests on your local selenium-server, build your project (${colors.cyan('tsc')}) and then run:`
        );
        Logger.error(colors.cyan(`  npx nightwatch --env selenium_server${configFlag}`), '\n');
        Logger.error('Or, run this command:');
        Logger.error(colors.cyan(`  npm run ${this.otherInfo.tsTestScript} -- --env selenium_server${configFlag}\n`));
      } else {
        Logger.error('To run tests on your local selenium-server, use command:');
        Logger.error(colors.cyan(`  npx nightwatch --env selenium_server${configFlag}`), '\n');
      }
    }

    if (answers.browsers?.includes('edge')) {
      Logger.error(`${colors.red('Note:')} Microsoft Edge Webdriver is not installed automatically.`);
      Logger.error(
        'Please follow the below link ("Download" and "Standalone Usage" sections) to setup EdgeDriver manually:'
      );
      Logger.error(colors.cyan('  https://nightwatchjs.org/guide/browser-drivers-setup/edgedriver.html'), '\n');
    }
  }

  postConfigInstructions(answers: ConfigGeneratorAnswers) {
    if (answers.seleniumServer && this.otherInfo.javaNotInstalled) {
      Logger.error('Java Development Kit (minimum v7) is required to run selenium-server locally. Download from here:');
      Logger.error(colors.cyan('  https://www.oracle.com/technetwork/java/javase/downloads/index.html'), '\n');
    }

    if (answers.language === 'ts') {
      Logger.error(
        `Since you are using TypeScript, please verify ${colors.magenta(
          'src_folders'
        )} once in your newly generated config file.`
      );
      Logger.error('It should point to the location of your transpiled (JS) test files.\n');
    }

    Logger.error('Happy Testing!!!');
  }
}
