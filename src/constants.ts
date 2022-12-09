import fs from 'node:fs';
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

Initializing project in %s...
`;

export const AVAILABLE_CONFIG_FLAGS = ['yes', 'generate-config', 'browser', 'y', 'b', 'mobile'];

export const BROWSER_CHOICES = [
  {name: 'Chrome', value: 'chrome'},
  {name: 'Safari', value: 'safari'},
  {name: 'Firefox', value: 'firefox'},
  {name: 'Edge', value: 'edge'}
];

export const MOBILE_BROWSER_CHOICES = [
  {name: 'Chrome (Android)', value: 'chrome'},
  {name: 'Firefox (Android)', value: 'firefox'},
  {name: 'Safari (iOS)', value: 'safari'}
];

export const MOBILE_BROWSER_QUES: inquirer.QuestionCollection =
{
  type: 'checkbox',
  name: 'mobileBrowsers',
  message: 'Which mobile browsers would you like to test on?',
  choices: () => {
    let devices = MOBILE_BROWSER_CHOICES;

    if (process.platform !== 'darwin') {
      devices = devices.filter((device) => device.value !== 'safari');
    }

    return devices;
  },
  default: ['chrome'],
  validate: (value) => {
    return !!value.length || 'Please select at least 1 browser.';
  },
  when: (answers) => {
    const mobileBrowserValues = MOBILE_BROWSER_CHOICES
      .map((browserObj) => browserObj.value);

    const browsersHasMobileBrowsers = (answers.browsers as string[] | undefined)
      ?.some(((browser: string) => mobileBrowserValues.includes(browser)));

    return answers.mobile && answers.backend !== 'remote' && !browsersHasMobileBrowsers;
  }
};

export const QUESTIONAIRRE: inquirer.QuestionCollection = [
  // answers.rootDir is available to all the questions (passed in Inquirer.prompt()).

  // TEST TYPE
  {
    type: 'checkbox',
    name: 'testType',
    message: 'Select testing type',
    choices: [
        {name: 'End-To-End Testing', value: 'e2e-test'},
        {name: 'Component Testing', value: 'ct-test'},
        // { name: 'mobile app testing', value: 'mobile-test' }
    ],
    default: ['e2e-test'],
    validate: (value) => {
      return !!value.length || 'Please select at least 1 testing type.';
    },
  },

  // JS OR TS
  {
    type: 'list',
    name: 'languageRunnerSetup',
    message: 'Select language + test runner variant',
    choices: (answers) => {
      const languageRunners = [
        {name: 'JavaScript / default', value: 'js-nightwatch'},
        {name: 'TypeScript / default', value: 'ts-nightwatch'},
        {name: 'JavaScript / Mocha', value: 'js-mocha'},
        {name: 'JavaScript / CucumberJS', value: 'js-cucumber'},
  
        // {name: 'TypeScript - Mocha Test Runner', value: 'ts-mocha'}
        // {name: 'TypeScript - CucumberJS Test Runner', value: 'ts-cucumber'}
      ]

      if (answers.testType.length === 1 && answers.testType.includes('ct-test')) {
        return languageRunners.filter((languageRunner) => !['js-mocha', 'js-cucumber'].includes(languageRunner.value))
      }

      return languageRunners;
    },
    filter: (value, answers) => {
      const [language, runner] = value.split('-');
      answers.language = language;
      answers.runner = runner;

      return value;
    }
  },

  // UI Framework
  {
    type: 'list',
    name: 'uiFramework',
    message: 'Select UI framework',
    choices: [
        {name: 'React', value: 'react'},
        {name: 'Vue.js', value: 'vue'},
        {name: 'Storybook', value: 'storybook'}
    ],
    when: (answers) => answers.testType.includes('ct-test')
  },

  // BROWSERS
  {
    type: 'checkbox',
    name: 'browsers',
    message: 'Select target browsers',
    choices: () => {
      let browsers = BROWSER_CHOICES;
      if (process.platform !== 'darwin') {
        browsers = browsers.filter((browser) => browser.value !== 'safari');
      }

      return browsers;
    },
    default: ['chrome'],
    validate: (value) => {
      return !!value.length || 'Please select at least 1 browser.';
    },
    when: (answers) => !answers.mobile
  },

  MOBILE_BROWSER_QUES,

  // TEST LOCATION
  {
    type: 'input',
    name: 'testsLocation',
    message: 'Enter source folder where test files are stored',
    default: (answers: {uiFramework: string}) => {
      if (answers.uiFramework === 'storybook') {
        return 'stories/*.stories.jsx';
      }

      return 'test';
    }
  },

  {
    type: 'input',
    name: 'featurePath',
    message: 'Enter location of CucumberJS feature files',
    default: (answers: { testsLocation: string }) => path.join(answers.testsLocation, 'features'),
    when: (answers) => answers.runner === 'cucumber'
  },

  // BASE URL
  {
    type: 'input',
    name: 'baseUrl',
    message: 'Enter the base_url of the project',
    default: (answers: {uiFramework: string}) => {
      if (['react', 'vue'].includes(answers.uiFramework)) {
        return 'http://localhost:5173';
      }
      
      if (answers.uiFramework === 'storybook') {
        return 'http://localhost:6006';
      }

      return 'http://localhost';
    }
  },

  // TESTING BACKEND
  {
    type: 'list',
    name: 'backend',
    message: 'Select where to run Nightwatch tests',
    choices: [
      {name: 'On localhost', value: 'local'},
      {name: 'On a remote/cloud service', value: 'remote'},
      {name: 'Both', value: 'both'}
    ],
    default: 'local'
  },

  {
    type: 'list',
    name: 'cloudProvider',
    message: '(Remote) Select cloud provider:',
    choices: [
      {name: 'BrowserStack', value: 'browserstack'},
      {name: 'Sauce Labs', value: 'saucelabs'},
      {name: 'Other providers or remote selenium-server', value: 'other'}
    ],
    when: (answers) => ['remote', 'both'].includes(answers.backend)
  },

  // ANONYMOUS METRIC COLLECTION
  {
    type: 'confirm',
    name: 'allowAnonymousMetrics',
    message: 'Allow Nightwatch to collect completely anonymous usage metrics?',
    default: false
  },

  // TEST ON MOBILE
  {
    type: 'list',
    name: 'mobile',
    message: 'Setup testing on Mobile devices as well?',
    choices: () => [
      {name: 'Yes', value: true},
      {name: 'No, skip for now', value: false}
    ],
    default: false
  },

  MOBILE_BROWSER_QUES
];

export const CONFIG_DEST_QUES: inquirer.QuestionCollection = [
  {
    type: 'list',
    name: 'overwrite',
    message: 'Overwrite the existing config file?',
    default: false,
    choices: [
      {name: 'Yes', value: true},
      {name: 'No, create a new one', value: false}
    ]
  },
  {
    type: 'input',
    name: 'newFileName',
    message: 'Enter new config file name:',
    validate: (value, answers) => {
      if (!value.length) {
        return 'File name cannot be empty.';
      } else if (answers && fs.existsSync(path.join(answers.rootDir, `${value}${answers.configExt}`))) {
        return `File with name "${value}${answers.configExt}" already exists.`;
      }

      return true;
    },
    transformer: (value, answers) => value + answers.configExt,
    when: (answers) => !answers.overwrite
  }
];
