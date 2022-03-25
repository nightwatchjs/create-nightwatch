const fs = require('fs');
const path = require('path');
const assert = require('assert');
const NightwatchInitMock = require('./mocks/init');

const rootDir = path.join(process.cwd(), 'test_output');

module.exports = {
  'test javascript': async (done) => {
    const options = [];
    const answers = {
      language: 'js',
      runner: 'nightwatch',
      backend: 'local',
      browsers: ['firefox', 'chrome', 'edge'],
      baseUrl: 'http://localhost',
    };

    const nightwatchInit = new NightwatchInitMock(rootDir, options, answers);
    await nightwatchInit.run();

    assert.strictEqual(fs.existsSync(path.join(rootDir, 'nightwatch.conf.js')));
    done();
  }
}