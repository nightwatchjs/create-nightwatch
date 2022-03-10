interface ConfigGeneratorAnswers {
  rootDir?: string;
  onlyConfig?: boolean;
  language?: "js" | "ts";
  backend?: 'local' | 'remote' | 'both';
  seleniumServer?: boolean;
  hostname?: string;
  port?: number;
  browserstack?: boolean;
  remoteName?: string;
  baseUrl?: string;
  runner?: 'nightwatch' | 'mocha' | 'cucumber';
  testsLocation?: string;
  addExamples?: boolean;
  examplesLocation?: string;
  additionalHelp?: string;
  browsers?: string[];
  defaultBrowser?: string;
  remoteBrowsers?: string[];
  tsOutDir?: string;
};

interface ConfigDestination {
  rootDir?: string;
  overwrite?: boolean;
  newFileName?: string;
}

interface OtherInfo {
  tsOutDir?: string;
  tsTestScript?: string;
  testsJsSrc?: string;
  examplesJsSrc?: string;
}
