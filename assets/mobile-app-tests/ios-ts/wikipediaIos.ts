import {NightwatchAPI} from 'nightwatch';

describe('Wikipedia iOS app test', function() {
  before(function(app: NightwatchAPI) {
    app.click('xpath', '//XCUIElementTypeButton[@name="Skip"]');
  });

  it('Search for BrowserStack', async function(app: NightwatchAPI) {
    app
      .useXpath()
      .click('//XCUIElementTypeSearchField[@name="Search Wikipedia"]')
      .sendKeys('//XCUIElementTypeSearchField[@name="Search Wikipedia"]', 'browserstack')
      .click('//XCUIElementTypeStaticText[@name="BrowserStack"]')
      .waitUntil(async function() {
        // wait for webview context to be available
        const contexts = await app.contexts();

        return contexts.length > 1;
      }, 5000)
      .perform(async function() {
        // switch to webview context
        const contexts = await app.contexts();
  
        await app.setContext(contexts[1]);
      })
      .useCss()
      .assert.textEquals('.pcs-edit-section-title', 'BrowserStack');  // command run in webview context
  });
});
