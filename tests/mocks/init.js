const NightwatchInit = require('../../lib/src/init');

module.exports = class NightwatchInitMock extends NightwatchInit {
  constructor(rootDir = process.cwd(), options, answers) {
    super(rootDir, options);
    this.answers = answers;
  }

  async askQuestions(onlyConfig) {
    return this.answers;
  }
}
