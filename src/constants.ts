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
`

export const CONFIG_INTRO = 
`===============================
Nightwatch Configuration Wizard
===============================

Just answer a few questions to get started with Nightwatch:

We'll setup everything for you :-)
`;

export const BROWSER_CHOICES = [
  {name: 'Chrome', value: 'chrome'},
  {name: 'Firefox', value: 'firefox'},
  {name: 'Edge', value: 'edge'},
  {name: 'Safari', value: 'safari'},
  {name: 'IE (requires selenium-server)', value: 'ie'}
];

// const WEBDRIVERS = {
//     'firefox': 'geckodriver',
//     'chrome': 'chromium',

// }

export const QUESTIONAIRRE: inquirer.QuestionCollection = [
  // answers.rootDir is available to all the questions (passed in Inquirer.prompt()).

  // JS OR TS
  {
    type: 'list',
    name: 'language',
    message: 'Do you want to use JavaScript or TypeScript?',
    choices: [
      {name: 'TypeScript', value: 'ts'},
      {name: 'JavaScript', value: 'js'}
    ]
  },

  // TESTING BACKEND
  {
    type: 'list',
    name: 'backend',
    message: 'Where is your automation backend located?',
    choices: [
      {name: 'On my local machine', value: 'local'},
      {name: 'On a remote machine (cloud)', value: 'remote'},
      {name: 'Both', value: 'both'}
    ],
    default: 'local'
  },

  // FOR LOCAL
  {
    type: 'confirm',
    name: 'seleniumServer',
    message: 'Will you be working with selenium-server on your local machine?',
    default: false,
    when: (answers) => ['local', 'both'].includes(answers.backend)
  },

  // FOR REMOTE
  {
    type: 'input',
    name: 'hostname',
    message: 'What is the host address of your remote machine?',
    default: 'localhost',
    when: (answers) => ['remote', 'both'].includes(answers.backend),
    filter: (value, answers) => {
      if (value.search('browserstack') !== -1) answers.browserstack = true;
      return value;
    }
  },
  {
    type: 'input',
    name: 'port',
    message: 'What is the port on which your test backend is running on your remote machine?',
    default: 80,
    when: (answers) => ['remote', 'both'].includes(answers.backend)
  },

  // BASE URL
  {
    type: 'input',
    name: 'baseUrl',
    message: 'What is the base_url of your project?',
    default: 'http://localhost'
  },

  // TEST RUNNER
  {
    type: 'list',
    name: 'runner',
    message: 'Which test runner do you want to use?',
    choices: [
      {name: 'Nightwatch', value: 'nightwatch'},
      {name: 'Mocha', value: 'mocha'},
      {name: 'Cucumber JS', value: 'cucumber'}
    ]
  },

  // TEST LOCATION
  {
    type: 'input',
    name: 'testsLocation',
    message: 'Where do you plan to keep your end-to-end tests?',
    default: 'tests'
  },

  // NIGHTWATCH EXAMPLES
  {
    type: 'list',
    name: 'addExamples',
    message: 'Add some Nightwatch examples for you to explore?',
    choices: [
      {name: 'Yes, please!', value: true},
      {name: 'No, thanks!', value: false}
    ],
    default: false,
    when: (answers) => !answers.onlyConfig
    // If the answer to this is false, add a line at the end that the test examples
    // are available at node_modules/...
  },
  {
    type: 'input',
    name: 'examplesLocation',
    message: 'Where to add example tests?',
    default: (answers: { testsLocation: string; }) => path.join('.', answers.testsLocation, 'nightwatch-examples'),
    validate: (value, answers) => {
      if (answers && fs.existsSync(path.join(answers.rootDir, value))) {
        return 'Directory already exists! Please choose a non-existent directory.';
      }

      return true;
    },
    when: (answers) => answers.addExamples
  },

  // BOILERPLATES
  {
    type: 'list',
    name: 'boilerplates',
    message: 'Add some boilerplates for using custom commands, custom assertions, etc.?',
    choices: [
      {name: 'Yes, please!', value: true},
      {name: 'No, thanks!', value: false}
    ],
    default: false,
    when: (answers) => !answers.onlyConfig
  },

  // ADDITIONAL HELP
  {
    type: 'list',
    name: 'additionalHelp',
    message: 'Do you need additional help in setting up your configuration file?',
    choices: [
      {name: 'Yes, please!', value: 'yes'},
      {name: 'Yes, but minimal help.', value: 'minimal'},
      {name: 'No, thanks!', value: 'no'}
    ],
    default: 'no'
  },
  
  // BROWSERS (LOCAL)
  {
    type: 'checkbox',
    name: 'browsers',
    message: 'Browsers you\'ll use for testing on your local machine?',
    choices: () => {
      const browsers = BROWSER_CHOICES;
      if (process.platform !== 'darwin') {
        return browsers.filter((browser) => browser.value !== 'safari');
      }

      return browsers;
    },
    default: ['chrome'],
    validate: (value) => {
      return !!value.length || 'Please select at least 1 browser.';
    },
    when: (answers) => answers.additionalHelp === 'yes' && ['local', 'both'].includes(answers.backend),
    filter: (value, answers) => {
      if (value.includes('ie')) answers.seleniumServer = true;
      return value;
    }
  },

  // BROWSERS (Remote)
  {
    type: 'checkbox',
    name: 'remoteBrowsers',
    message: 'Browsers you\'ll use for testing on your remote machine?',
    choices: () => {
      const browsers = BROWSER_CHOICES;
      // Remove selenium-server note from IE.
      browsers.forEach((browser) => {
        if (browser.value === 'ie') {browser.name = 'IE'}
      });

      return browsers;
    },
    default: (answers: { browsers: string[]; }) => answers.browsers,
    validate: (value) => {
      return !!value.length || 'Please select at least 1 browser.';
    },
    when: (answers) => answers.additionalHelp === 'yes' && ['remote', 'both'].includes(answers.backend)
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
        // } else if (value.split('.').length > 1) {
        //   return `Please input the file name without any file-extensions.
        //   An extension of '.conf.js' will automatically be added to your file name.`;
      } else if (answers && fs.existsSync(path.join(answers.rootDir, `${value}.conf.js`))) {
        return `File with name "${value}.conf.js" already exists.`;
      }

      return true;
    },
    transformer: (value) => value + '.conf.js',
    // transformer: (value, answers, { isFinal }) => isFinal ? value : value + '.conf.js',
    // filter: (value) => value + '.conf.js',
    when: (answers) => !answers.overwrite
  }
];
