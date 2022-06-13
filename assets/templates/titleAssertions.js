/**
 * If you wanted to learn more about describe interface. Refer this :
 * https://nightwatchjs.org/guide/writing-tests/test-syntax.html
 */
describe('Title Assertion', () => {
    /**
     * This section will always execute before the test suite
     * 
     * Read More : https://nightwatchjs.org/guide/writing-tests/using-test-hooks.html#before-beforeeach-after-aftereach
     */ 
    before(browser => {
        /**
         * -------------------- Navigate to a URL ------------------------
         * 
         * Please enter the login page URL, which you wanted to navigate
         * 
         * Read More : https://nightwatchjs.org/api/navigateTo.html
         * 
         * Eg : browser.navigateTo('https://github.com');
         */

        browser.navigateTo('<LOGIN-PAGE-URL>');
    });


    // This is the test case
    it('To test title', function (browser) {
        /**
         * -------------------- Check title ------------------------
         * 
         * Please enter the title of the URL
         * 
         * Read More : https://nightwatchjs.org/api/title.html
         * 
         * Eg : browser.assert.title('GitHub: Where the world builds software · GitHub');
         */

        browser.assert.title('<TITLE>');
    });


    // This section will always execute after the test suite
    after(browser => {
        // This is used to close the browser's session
        browser.end()
    });
});