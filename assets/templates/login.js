/**
 * If you wanted to learn more about describe interface. Refer this :
 * https://nightwatchjs.org/guide/writing-tests/test-syntax.html
 */
describe('The Login Page', () => {

    /**
     * This section will always execute before the test suite
     * 
     * Read More : https://nightwatchjs.org/guide/writing-tests/using-test-hooks.html#before-beforeeach-after-aftereach
     */ 
    before(browser => {
        /**
         * -------------------- Navigate to a URL ------------------------
         * 
         * Please enter the login page URL, which you wanted to navigate and login
         * 
         * Read More : https://nightwatchjs.org/api/navigateTo.html
         * 
         * Eg : https://the-internet.herokuapp.com/login
         */

        browser.navigateTo('<LOGIN-PAGE-URL>');
    });

    
    // This is the test case
    it('To check session cookie after successful login', function (browser) {

        /**
         * --------- Check if the USERNAME input box is present ----------
         * 
         * - Here we have used isPresent command, to check the username input box is present or not.
         * - In isPresent commabd, 1st argument will be the Locate strategy and the 2nd argument will be the selectors. 
         *   You can remove the 1st argument, if you want to choose 'css selector' since it is deafult. 
         * - Read more about locators and selectors https://www.selenium.dev/documentation/webdriver/elements/locators/
         *       
         *   For eg. :
         *               |   Locator strategy   |      Selector            |
         *          -----|--------------------- + -------------------------|
         *           1   |  css selector        |  '#main ul li a.first'   |
         *           2   |  xpath               |  '//*[@id="username"]'   |
         *           3   |  link text           |  'click here'            |
         *           4   |  partial link text   |  'click here'            |
         *           5   |  tag name            |  'div'                   |
         * 
         * - If you don't have anything to do in callback, you can skip it too.
         * 
         * Read More : https://nightwatchjs.org/api/isVisible.html
         * 
         * Eg : browser.isPresent('input[id=username]', function(result) {
         *          this.assert.equal(typeof result, "object");
         *      });
         */

        browser.isPresent('<locator strategy>', '<selector>', function (result) {
            // This place can be used to test the result 
            this.assert.equal(typeof result, "object");
            this.assert.equal(result.status, 0);
            this.assert.equal(result.value, true);
        });


        /**
        * -------------------- Enter the USERNAME -----------------------
        * 
        * - sendKeys command is used to send keyboard keys strokes. We can use it to fill the username
        * - In sendKeys, 1st argument and 2nd argument will be locators and selectors respectively and in this
        *   case they will be same as above.
        * 
        * Read More : https://nightwatchjs.org/api/sendKeys.html
        * 
        * Eg : browser.sendKeys('input[id=username]', 'tomsmith');
        */

        browser.sendKeys('<locator strategy>', '<selector>', '<username>');


        /**
         * ----------- Check if the Password input box is present ------------
         * 
         * Eg : browser.isPresent('input[id=password]', function(result) {
         *          this.assert.equal(typeof result, "object");
         *      });
         */

        browser.isPresent('<locator strategy>', '<selector>', function (result) {
            // This place can be used to test the result 
            this.assert.equal(typeof result, "object");
            this.assert.equal(result.status, 0);
            this.assert.equal(result.value, true);
        });


        /**
          * --------------- Enter the Password and form submission ---------------
          * Here browser.Keys.ENTER is used to press enter stroke after filling the password and submit the form. 
          * 
          * Eg : browser.sendKeys('input[id="password"]', ['SuperSecretPassword!', browser.Keys.ENTER]);
          */

        browser.sendKeys('<locator strategy>', '<selector>', ['<password>', browser.Keys.ENTER]);


        /**
         * If ENTER doesn't work for you then you can use 'click' command to click on submit button.
         * 
         * Read More : https://nightwatchjs.org/api/click.html
         * 
         * Eg: browser.click('css selector', '#submitButton');
         */


        /**
         * -------------------- Check the new URL is correct -----------------------
         * 
         * Read More : https://nightwatchjs.org/api/assert/#assert-urlMatches
         * 
         * Eg:  browser.assert.urlContains('/dashboard');
         */

        browser.assert.urlContains('<NEW-REDIRCTED-URL>');


        /**
         * ------ Check session cookie is present after successful login -----------
         * 
         * Read More : https://nightwatchjs.org/api/getCookie.html
         * 
         * Eg:  browser.getCookie('session-cookie', function callback(result) {
         *          this.assert.equal(result.value, '123456');
         *          this.assert.equals(result.name, 'test_cookie');
         *      });
         */

        browser.getCookie('<cookie-name>', function callback(result) {
            // This place can be used to test the result
            this.assert.equal(result.value, '<cookie-value>');
            this.assert.equals(result.name, '<cookie-name>');
        });
    });


    // This section will always execute after the test suite
    after(browser => {
        // This is used to close the browser's session
        browser.end()
    });
});
