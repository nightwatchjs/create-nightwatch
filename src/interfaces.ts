export interface ConfigGeneratorAnswers {
  rootDir?: string;
  onlyConfig?: boolean;
  languageRunnerSetup?: string;
  language?: 'js' | 'ts';
  backend?: 'local' | 'remote' | 'both';
  seleniumServer?: boolean;
  cloudProvider?: 'browserstack' | 'saucelabs' | 'other';
  remoteName?: string;
  remoteEnv?: {
    username: string;
    access_key: string;
  };
  baseUrl?: string;
  runner?: 'nightwatch' | 'mocha' | 'cucumber';
  testsLocation?: string;
  featurePath?: string;
  addExamples?: boolean;
  examplesLocation?: string;
  browsers?: string[];
  defaultBrowser?: string;
  remoteBrowsers?: string[];
}

export interface ConfigDestination {
  rootDir?: string;
  overwrite?: boolean;
  newFileName?: string;
}

export interface OtherInfo {
  tsOutDir?: string;
  tsTestScript?: string;
  testsJsSrc?: string;
  examplesJsSrc?: string;
  cucumberExamplesAdded?: boolean;
  javaNotInstalled?: boolean;
  nonDefaultConfigName?: string;
}
