describe('Wikipedia Android app test', function() {
  before(function(app) {
    app.click('id', 'org.wikipedia:id/fragment_onboarding_skip_button');
  });

  it('Search for BrowserStack', async function(app) {
    app
      .click('id', 'org.wikipedia:id/search_container')
      .sendKeys('id', 'org.wikipedia:id/search_src_text', 'browserstack')
      .click({selector: 'org.wikipedia:id/page_list_item_title', locateStrategy: 'id', index: 0})
      .waitUntil(async function() {
        // wait for webview context to be available
        const contexts = await this.contexts();

        return contexts.length > 1;
      })
      .perform(async function() {
        // switch to webview context
        const contexts = await this.contexts();

        await this.setContext(contexts[1]);
      })
      .assert.textEquals('.pcs-edit-section-title', 'BrowserStack');  // command run in webview context
  });
});
