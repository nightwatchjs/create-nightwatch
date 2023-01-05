import {AndroidSetup, IosSetup} from '@nightwatch/mobile-helper';

export interface ConfigGeneratorAnswers {
  rootDir?: string;
  onlyConfig?: boolean;
  testingType?: Array<'e2e' | 'component' | 'app'>
  languageRunnerSetup?: string;
  language?: 'js' | 'ts';
  runner?: 'nightwatch' | 'mocha' | 'cucumber';
  backend?: 'local' | 'remote' | 'both';
  seleniumServer?: boolean;
  cloudProvider?: 'browserstack' | 'saucelabs' | 'other';
  remoteName?: string;
  remoteEnv?: {
    username: string;
    access_key: string;
  };
  baseUrl?: string;
  testsLocation?: string;
  featurePath?: string;
  addExamples?: boolean;
  examplesLocation?: string;
  browsers?: string[];
  defaultBrowser?: string;
  remoteBrowsers?: string[];
  allowAnonymousMetrics?: boolean;
  mobile?: boolean;
  mobileRemote?: boolean;
  mobileBrowsers?: string[];
  native?: boolean;
  mobilePlatform?: 'android' | 'ios' | 'both';
  uiFramework?: 'react' | 'vue' | 'storybook';
  plugins?: string[];
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
  templatesGenerated?: boolean;
  javaNotInstalled?: boolean;
  nonDefaultConfigName?: string;
  usingESM?: boolean;
}

export interface MobileHelperResult {
  android?: Awaited<ReturnType<AndroidSetup['run']>>;
  ios?: Awaited<ReturnType<IosSetup['run']>>;
}
