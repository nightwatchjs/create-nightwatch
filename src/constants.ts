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

export const AVAILABLE_CONFIG_FLAGS = ['yes', 'generate-config', 'browser', 'y', 'b', 'mobile', 'app', 'native'];

export const HELPTEXT = `
Nightwatch - Integrated Testing Framework for Modern Web and Mobile Applications

Usage:
  npm init nightwatch@latest -- [options]

Options:
  --generate-config      Generate a configuration file in an existing Nightwatch project.
  --mobile               Set up testing for mobile browsers only.
  -b, --browser <name>   Specify browser(s) for testing (e.g., chrome, firefox).
  -y, --yes              Skip prompts and use default configuration.
  -h, --help             Show this help message and exit.

Examples:
  Initialize a new project in the current directory:
    npm init nightwatch@latest

  Initialize a new project in a specified directory:
    npm init nightwatch@latest ./path/to/project

  Set up mobile testing only:
    npm init nightwatch@latest -- --mobile

  Generate a configuration file in an existing project:
    npm init nightwatch@latest -- --generate-config

For more information, visit: https://nightwatchjs.org
`;