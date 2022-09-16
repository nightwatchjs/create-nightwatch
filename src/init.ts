import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import colors from 'ansi-colors';
import https from 'https';
import {prompt} from 'inquirer';
import {execSync} from 'child_process';
import {v4 as uuid} from 'uuid';
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
  client_id: string;

  constructor(rootDir = process.cwd(), options: Omit<ParsedArgs, '_'>) {
    this.rootDir = rootDir;
    this.options = options;
    this.otherInfo = {};
    this.onlyConfig = false;
    this.client_id = uuid();
  }

  async run() {
    let answers: ConfigGeneratorAnswers = {};

    if (this.options?.['generate-config']) {
      this.onlyConfig = true;
    }

    if (this.options?.yes) {
      if (this.options?.browser) {
        defaultAnswers.browsers = this.options.browser;
      }
      answers = defaultAnswers as ConfigGeneratorAnswers;
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
        
        // For now the templates added only for JS
        if (answers.language !== 'ts') {
          this.copyTemplates(answers.examplesLocation || '');
        }
      }

      // Post instructions to run their first test
      this.postSetupInstructions(answers);
    } else {
      // Post config instructions
      this.postConfigInstructions(answers);
    }

    if (answers.allowAnonymousMetrics) {
      this.pushAnonymousMetrics(answers);
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
      answers.remoteName = 'remote';
      if (answers.cloudProvider !== 'other') {
        answers.remoteName = answers.cloudProvider;
      }

      answers.remoteEnv = {
        username: 'REMOTE_USERNAME',
        access_key: 'REMOTE_ACCESS_KEY'
      };
      if (answers.cloudProvider === 'browserstack') {
        answers.remoteEnv.username = 'BROWSERSTACK_USERNAME';
        answers.remoteEnv.access_key = 'BROWSERSTACK_ACCESS_KEY';
      } else if (answers.cloudProvider === 'saucelabs') {
        answers.remoteEnv.username = 'SAUCE_USERNAME';
        answers.remoteEnv.access_key = 'SAUCE_ACCESS_KEY';
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
        // Find a location for putting the example files.
        const testsDestPath = path.join(this.rootDir, answers.testsLocation);
        if (fs.existsSync(testsDestPath) && fs.readdirSync(testsDestPath).length) {
          // If testsLocation already contains some files, put the examples in a
          // separate directory.
          answers.examplesLocation = 'nightwatch-examples';
        } else {
          // Put examples directly into testsLocation, to be used as boilerplate.
          answers.examplesLocation = answers.testsLocation;
        }
      }
    }
  }

  identifyPackagesToInstall(answers: ConfigGeneratorAnswers): string[] {
    const packages: string[] = ['nightwatch'];

    if (answers.language === 'ts') {
      packages.push('typescript', '@types/nightwatch', 'ts-node');
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

    // Generate a new tsconfig.json file if not already present.
    if (!fs.existsSync(tsConfigPath)) {
      execSync('npx tsc --init', {
        stdio: 'inherit',
        cwd: this.rootDir
      });
      Logger.error();
    }

    // Generate a new tsconfig.json file to be used by ts-node, if not already present.
    const tsConfigNightwatchPath1 = path.join(this.rootDir, 'nightwatch', 'tsconfig.json');
    const tsConfigNightwatchPath2 = path.join(this.rootDir, 'tsconfig.nightwatch.json');

    if (!fs.existsSync(tsConfigNightwatchPath1) && !fs.existsSync(tsConfigNightwatchPath2)) {
      const tsConfigSrcPath = path.join(__dirname, '..', 'assets', 'tsconfig.json');
      const tsConfigDestPath = path.join(this.rootDir, 'nightwatch', 'tsconfig.json');

      try {
        fs.mkdirSync(path.join(this.rootDir, 'nightwatch'));
        // eslint-disable-next-line
      } catch (err) {}

      fs.copyFileSync(tsConfigSrcPath, tsConfigDestPath);
    }

    // Set outDir property to null for now.
    this.otherInfo.tsOutDir = '';
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
    const custom_assertions_path: string[] = []; // to go as the value of custom_assertions_path property.
    const feature_path = answers.featurePath || ''; // to be used in cucumber feature_path property.

    const testsJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.testsLocation || '');
    if (testsJsSrc !== '.') {
      if (answers.testsLocation === answers.examplesLocation && answers.language === 'js' && answers.runner !== 'cucumber') {
        // examples are being put as a boilerplate in testsLocation with main tests in
        // 'specs' sub-directory (only done for JS-Nightwatch and JS-Mocha).
        src_folders.push(path.join(testsJsSrc, 'specs'));
      } else {
        src_folders.push(testsJsSrc);
      }
      this.otherInfo.testsJsSrc = testsJsSrc;
    }

    if (answers.addExamples && answers.runner !== 'cucumber') {
      // Add examplesLocation to src_folders, if different from testsLocation.
      // Don't add for cucumber examples (for now, as addition of examples depends upon featurePath in copyCucumberExamples).
      const examplesJsSrc: string = path.join(this.otherInfo.tsOutDir || '', answers.examplesLocation || '');
      if (examplesJsSrc !== testsJsSrc) {
        if (answers.language === 'js') {
          // Only for JS-Nightwatch and JS-Mocha.
          src_folders.push(path.join(examplesJsSrc, 'specs'));
        } else {
          src_folders.push(examplesJsSrc);
        }
      }
      this.otherInfo.examplesJsSrc = examplesJsSrc;

      if (answers.language === 'js') {
        // Right now, we only ship page-objects/custom-commands/custom-assertions
        // examples with JS (Nightwatch and Mocha test runner) only.
        page_objects_path.push(`${path.join(examplesJsSrc, 'page-objects')}`);
        custom_commands_path.push(`${path.join(examplesJsSrc, 'custom-commands')}`);
        custom_assertions_path.push(`${path.join(examplesJsSrc, 'custom-assertions')}`);
      }
    }

    const tplData = fs.readFileSync(templateFile).toString();

    let rendered = ejs.render(tplData, {
      plugins: false,
      src_folders: JSON.stringify(src_folders).replace(/"/g, '\'').replace(/\\\\/g, '/'),
      page_objects_path: JSON.stringify(page_objects_path).replace(/"/g, '\'').replace(/\\\\/g, '/'),
      custom_commands_path: JSON.stringify(custom_commands_path).replace(/"/g, '\'').replace(/\\\\/g, '/'),
      custom_assertions_path: JSON.stringify(custom_assertions_path).replace(/"/g, '\'').replace(/\\\\/g, '/'),
      feature_path: feature_path.replace(/\\/g, '/'),
      client_id: this.client_id,
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
    if (answers.browsers?.includes('safari')) {
      webdrivers.push('safaridriver');
    }

    return webdrivers;
  }

  async installWebdrivers(webdriversToInstall: string[]) {
    Logger.error('Installing/updating the following webdrivers:');
    for (const webdriver of webdriversToInstall) {
      Logger.error(`- ${webdriver}`);
    }
    Logger.error();

    const driversDownloadedFromNPM: { [key: string]: string } = {
      geckodriver: 'Firefox',
      chromedriver: 'Chrome'
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


  copyTemplates(examplesLocation: string) {
    Logger.error('Generating template files...');

    const templatesLocation = path.join(examplesLocation, 'templates');

    const templatesDestPath = path.join(this.rootDir, templatesLocation);

    try {
      fs.mkdirSync(templatesDestPath, {recursive: true});
      // eslint-disable-next-line
    } catch (err) {}

    if (fs.readdirSync(templatesDestPath).length) {
      Logger.error(`Templates already exists at '${templatesLocation}'. Skipping...`, '\n');

      return;
    }

    const templatesSrcPath = path.join(__dirname, '..', 'assets', 'templates');
    
    copy(templatesSrcPath, templatesDestPath);

    Logger.error(
      `${colors.green(symbols().ok + ' Success!')} Generated some templates files at '${templatesLocation}'.\n`
    );
  }

  postSetupInstructions(answers: ConfigGeneratorAnswers) {
    Logger.error('Nightwatch setup complete!!\n');

    // Join Discord and GitHub
    Logger.error('Join our Discord community and instantly find answers to your issues or queries. Or just join and say hi!');
    Logger.error(colors.cyan('  https://discord.gg/SN8Da2X'), '\n');

    Logger.error('Visit our GitHub page to report bugs or raise feature requests:');
    Logger.error(colors.cyan('  https://github.com/nightwatchjs/nightwatch'), '\n');

    // Instructions for setting host, port, username and passowrd for remote.
    if (answers.backend && ['remote', 'both'].includes(answers.backend)) {
      Logger.error(colors.red('IMPORTANT'));
      if (answers.cloudProvider === 'other') {
        let configFileName = 'nightwatch.conf.js';
        if (this.otherInfo.nonDefaultConfigName) {
          configFileName = this.otherInfo.nonDefaultConfigName;
        }
        Logger.error(
          `To run tests on your remote device, please set the ${colors.magenta('host')} and ${colors.magenta('port')} property in your ${configFileName} file.` 
        );
        Logger.error('These can be located at:');
        Logger.error(
          `{\n  ...\n  "test_settings": {\n    ...\n    "${answers.remoteName}": {\n      "selenium": {\n        ${colors.cyan(
            '"host":')}\n        ${colors.cyan('"port":')}\n      }\n    }\n  }\n}`,
          '\n'
        );

        Logger.error(
          'Please set the credentials (if any) required to run tests on your cloud provider or remote selenium-server, by setting the below env variables:'
        );
      } else {
        Logger.error(
          'Please set the credentials required to run tests on your cloud provider, by setting the below env variables:'
        );
      }

      Logger.error(`- ${colors.cyan(answers.remoteEnv?.username as string)}`);
      Logger.error(`- ${colors.cyan(answers.remoteEnv?.access_key as string)}`);
      Logger.error('(.env files are also supported)', '\n');
    }
    Logger.error();

    const relativeToRootDir = path.relative(process.cwd(), this.rootDir) || '.';

    // For now the templates added only for JS
    if (answers.runner !== 'cucumber' && answers.language !== 'ts') {
      Logger.error(colors.green('TEMPLATE TESTS'), '\n');
      Logger.error('To get started, checkout the following templates. Skip/delete them if you are an experienced user.');
      Logger.error(colors.cyan(`  1. Title Assertion (${path.join(relativeToRootDir, answers.examplesLocation || '', 'templates', 'titleAssertion.js')})`));
      Logger.error(colors.cyan(`  2. Login (${path.join(relativeToRootDir, answers.examplesLocation || '', 'templates', 'login.js')})`));
      Logger.error();
    }

    Logger.error(colors.green('RUN NIGHTWATCH TESTS'), '\n');
    if (this.rootDir !== process.cwd()) {
      Logger.error('First, change directory to the root dir of your project:');
      Logger.error(colors.cyan(`  cd ${relativeToRootDir}`), '\n');
    }

    let envFlag = '';
    if (answers.backend === 'remote') {
      envFlag = ` --env ${answers.remoteName}`;
    }

    let configFlag = '';
    if (this.otherInfo.nonDefaultConfigName) {
      configFlag = ` --config ${this.otherInfo.nonDefaultConfigName}`;
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
        Logger.error(
          colors.cyan(`  npx nightwatch .${path.sep}${this.otherInfo.examplesJsSrc}${envFlag}${configFlag}\n`)
        );

        Logger.error('To run a single example (github.ts), run:');
        Logger.error(
          colors.cyan(
            `  npx nightwatch .${path.sep}${path.join(
              this.otherInfo.examplesJsSrc || '',
              'github.ts'
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

      Logger.error('To run tests on your local selenium-server, use command:');
      Logger.error(colors.cyan(`  npx nightwatch --env selenium_server${configFlag}`), '\n');
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

    Logger.error('Happy Testing!!!');
  }

  pushAnonymousMetrics(answers: ConfigGeneratorAnswers) {
    const GA_API_KEY = 'XuPojOTwQ6yTO758EV4hBg';
    const GA_TRACKING_ID = 'G-DEKPKZSLXS';

    const payload = {
      'client_id': this.client_id,
      'non_personalized_ads': true,
      'timestamp_micros': new Date().getTime() * 1000,
      'events': {
        'name': 'nw_install',
        'params': {
          browsers: answers.browsers?.join(','),
          cloudProvider: answers.cloudProvider,
          language: answers.language,
          runner: answers.runner,
          addExample: answers.addExamples
        }
      }
    };

    const data = JSON.stringify(payload);

    const options = {
      hostname: 'www.google-analytics.com',
      port: 443,
      path: `/mp/collect?api_secret=${GA_API_KEY}&measurement_id=${GA_TRACKING_ID}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options);
    req.write(data);
    req.end();
  }
}
