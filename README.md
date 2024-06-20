# Nightwatch.js

[![npm](https://img.shields.io/npm/v/nightwatch.svg)](https://www.npmjs.com/package/nightwatch)
[![Node.js CI](https://github.com/nightwatchjs/nightwatch/actions/workflows/build-node.yaml/badge.svg?branch=main)](https://github.com/nightwatchjs/nightwatch/actions/workflows/build-node.yaml)
[![codecov](https://codecov.io/gh/nightwatchjs/nightwatch/branch/main/graph/badge.svg?token=MSObyfECEh)](https://codecov.io/gh/nightwatchjs/nightwatch)
[![Discord][discord-badge]][discord]

<p align="center">
  <img alt="Nightwatch.js Logo" src="https://raw.githubusercontent.com/nightwatchjs/nightwatch/main/.github/assets/nightwatch-logo.png" width=300 />
</p>

#### [Homepage](https://nightwatchjs.org) &bullet; [Developer Guide](https://nightwatchjs.org/guide) &bullet; [API Reference](https://nightwatchjs.org/api) &bullet; [About](https://nightwatchjs.org/about) &bullet; [Blog](https://nightwatchjs.org/blog)

Nightwatch is an integrated testing framework powered by Node.js and using the [W3C Webdriver API](https://www.w3.org/TR/webdriver/). It is a complete testing solution developed at [BrowserStack](https://www.browserstack.com/) and which can be used for:

☑️ end-to-end testing of web applications and websites

☑️ component testing in isolation (React / Vue / Storybook / Angular)

☑️ Node.js unit, visual regression testing, accessibility testing & API testing

☑️ Native mobile app testing on Android & iOS

---

#### 1. Install Nightwatch from NPM

From your existing project's root dir:

```sh
npm init nightwatch@latest
```

or, if you want to initialize a new project:

```sh
npm init nightwatch@latest ./path/to/new/project
```

For testing on mobile browsers only:

```sh
npm init nightwatch@latest -- --mobile
```

Generate a new config file in your existing Nightwatch project:

```sh
npm init nightwatch@latest -- --generate-config
```

#### 2. Answer a few questions about your preferred setup:

- What is your Language - Test Runner setup?
- Where do you want to run your e2e tests?
- Which browsers will you be testing on?
- Where do you plan to keep your end-to-end tests?
- What is the base_url of your project?
- Allow Nightwatch to anonymously collect usage metrics?
- Would you like to run your e2e tests on Mobile devices as well?

Nightwatch will do the entire setup for you based on your answers.

#### 3. Run a Demo Test:

Nightwatch comes with a few examples, which are automatically copied to your Nightwatch project during the setup and can also be used as boilerplate to write your own tests on top of them.

You can follow the instructions given at the end of the setup to run your first test with Nightwatch.

<img width="413" alt="image" src="https://user-images.githubusercontent.com/39924567/174763723-aff4d501-6320-402c-81cc-de75fbb5e8f0.png">

## Contributing

We welcome any and all community contributions that may help us enhance Nightwatch.

### Running locally

1. First, fork the repository to your own GitHub account.
2. Clone the forked repository from your own GitHub account by running the following command in terminal:
   ```sh
   git clone https://github.com/<USERNAME>/create-nightwatch.git
   ```
3. Navigate to the locally cloned repository:
   ```sh
   cd create-nightwatch
   ```
4. Install all the dependencies:
   ```sh
   npm install
   ```
5. Run the project locally:
   ```sh
   npm run create-nightwatch <project-name>
   ```

## Licence

[MIT](https://github.com/nightwatchjs/nightwatch/blob/main/LICENSE.md)

[discord-badge]: https://img.shields.io/discord/618399631038218240.svg?color=7389D8&labelColor=6A7EC2&logo=discord&logoColor=ffffff&style=flat-square
[discord]: https://discord.gg/SN8Da2X
