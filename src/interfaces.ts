import {AndroidSetup, IosSetup} from '@nightwatch/mobile-helper';

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
  mobile?: boolean;
  mobileDevice?: 'ios' | 'android' | 'both';
  mobileBrowsers?: string[];
  defaultBrowser?: string;
  remoteBrowsers?: string[];
  allowAnonymousMetrics?: boolean;
  mobileRemote?: boolean
}

export interface ConfigDestination {
  rootDir?: string;
  overwrite?: boolean;
  newFileName?: string;
}

export interface OtherInfo {
  tsOutDir?: string;
  testsJsSrc?: string;
  examplesJsSrc?: string;
  cucumberExamplesAdded?: boolean;
  javaNotInstalled?: boolean;
  nonDefaultConfigName?: string;
}

export interface MobileResult {
  android?: Awaited<ReturnType<AndroidSetup['run']>>;
  ios?: Awaited<ReturnType<IosSetup['run']>>;
}
