import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';

export const NIGHTWATCH_TITLE = `
 _   _  _         _      _                     _          _
| \\ | |(_)       | |    | |                   | |        | |
|  \\| | _   __ _ | |__  | |_ __      __  __ _ | |_   ___ | |__
| . \` || | / _\` || '_ \\ | __|\\ \\ /\\ / / / _\` || __| / __|| '_ \\
| |\\  || || (_| || | | || |_  \\ V  V / | (_| || |_ | (__ | | | |
\\_| \\_/|_| \\__, ||_| |_| \\__|  \\_/\\_/   \\__,_| \\__| \\___||_| |_|
            __/ |
           |___/
`;

export const CONFIG_INTRO = `===============================
Nightwatch Configuration Wizard
===============================

Just answer a few questions to get started with Nightwatch:

We'll setup everything for you :-)
`;

export const AVAILABLE_CONFIG_FLAGS = ['yes', 'generate-config', 'browser', 'y', 'b'];

export const BROWSER_CHOICES = [
  {name: 'Firefox', value: 'firefox'},
  {name: 'Chrome', value: 'chrome'},
  {name: 'Edge', value: 'edge'},
  {name: 'Safari', value: 'safari'},
  {name: 'IE (requires selenium-server)', value: 'ie'}
];

export const QUESTIONAIRRE: inquirer.QuestionCollection = [
  // answers.rootDir is available to all the questions (passed in Inquirer.prompt()).

  // JS OR TS
  {
    type: 'list',
    name: 'languageRunnerSetup',
    message: 'What is your Language - Test Runner setup?',
    choices: [
      {name: 'JavaScript - Nightwatch Test Runner', value: 'js-nightwatch'},
      {name: 'JavaScript - Mocha Test Runner', value: 'js-mocha'},
      {name: 'JavaScript - CucumberJS Test Runner', value: 'js-cucumber'},
      {name: 'TypeScript - Nightwatch Test Runner', value: 'ts-nightwatch'},
      {name: 'TypeScript - Mocha Test Runner', value: 'ts-mocha'}
      // {name: 'TypeScript - CucumberJS Test Runner', value: 'ts-cucumber'}
    ],
    filter: (value, answers) => {
      const [language, runner] = value.split('-');
      answers.language = language;
      answers.runner = runner;

      return value;
    }
  },

  // TESTING BACKEND
  {
    type: 'list',
    name: 'backend',
    message: 'Where do you want to run your e2e tests?',
    choices: [
      {name: 'On my local machine', value: 'local'},
      {name: 'On a remote machine (cloud)', value: 'remote'},
      {name: 'Both', value: 'both'}
    ],
    default: 'local'
  },

  {
    type: 'list',
    name: 'cloudProvider',
    message: '(Remote) Please select your cloud provider:',
    choices: [
      {name: 'BrowserStack', value: 'browserstack'},
      {name: 'Sauce Labs', value: 'saucelabs'},
      {name: 'Other providers or remote selenium-server', value: 'other'}
    ],
    when: (answers) => ['remote', 'both'].includes(answers.backend)
  },

  // BROWSERS
  {
    type: 'checkbox',
    name: 'browsers',
    message: (answers) => `${answers.backend === 'both' ? '(Local) ' : ''}Where you'll be testing on?`,
    choices: (answers) => {
      let browsers = BROWSER_CHOICES;
      if (answers.backend === 'local' && process.platform !== 'darwin') {
        browsers = browsers.filter((browser) => browser.value !== 'safari');
      }

      if (['local', 'both'].includes(answers.backend)) {
        browsers = browsers.concat({name: 'Local selenium-server', value: 'selenium-server'});
      } else {
        // if answers.backend === 'remote', remove selenium-server note from IE.
        browsers.forEach((browser) => {
          if (browser.value === 'ie') {
            browser.name = 'IE';
          }
        });
      }

      return browsers;
    },
    default: ['firefox'],
    validate: (value) => {
      if (value.length === 1 && value.includes('selenium-server')) {
        return 'Please select at least 1 browser.';
      }

      return !!value.length || 'Please select at least 1 browser.';
    }
  },

  // FOR REMOTE
  {
    type: 'checkbox',
    name: 'remoteBrowsers',
    message: '(Remote) Where you\'ll be testing on?',
    choices: () => {
      const browsers = BROWSER_CHOICES;
      // Remove selenium-server note from IE.
      browsers.forEach((browser) => {
        if (browser.value === 'ie') {
          browser.name = 'IE';
        }
      });

      return browsers;
    },
    default: (answers: { browsers: string[] }) => answers.browsers,
    validate: (value) => {
      return !!value.length || 'Please select at least 1 browser.';
    },
    when: (answers) => answers.backend === 'both'
  },

  // TEST LOCATION
  {
    type: 'input',
    name: 'testsLocation',
    message: 'Where do you plan to keep your end-to-end tests?',
    default: 'tests'
  },

  {
    type: 'input',
    name: 'featurePath',
    message: 'Where do you plan to keep your CucumberJS feature files?',
    default: (answers: { testsLocation: string }) => path.join(answers.testsLocation, 'features'),
    when: (answers) => answers.runner === 'cucumber'
  },

  // BASE URL
  {
    type: 'input',
    name: 'baseUrl',
    message: 'What is the base_url of your project?',
    default: 'http://localhost'
  }
];

export const CONFIG_DEST_QUES: inquirer.QuestionCollection = [
  {
    type: 'list',
    name: 'overwrite',
    message: 'Do you want to overwrite the existing config file?',
    default: false,
    choices: [
      {name: 'Yes', value: true},
      {name: 'No, create a new one!', value: false}
    ]
  },
  {
    type: 'input',
    name: 'newFileName',
    message: 'What should your new config file be called?',
    validate: (value, answers) => {
      if (!value.length) {
        return 'File name cannot be empty.';
      } else if (answers && fs.existsSync(path.join(answers.rootDir, `${value}.conf.js`))) {
        return `File with name "${value}.conf.js" already exists.`;
      }

      return true;
    },
    transformer: (value) => value + '.conf.js',
    when: (answers) => !answers.overwrite
  }
];
