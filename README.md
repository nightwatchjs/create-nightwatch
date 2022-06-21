# create-nightwatch

The Nightwatch CLI tool lets you setup Nightwatch.js in your new or existing project, with all the required configs and dependencies, with just one command.

[![npm](https://img.shields.io/npm/v/nightwatch.svg)](https://www.npmjs.com/package/nightwatch)
[![Node.js CI](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/ubuntu-latest.yml/badge.svg?branch=main)](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/ubuntu-latest.yml)
[![Node.js CI](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/windows-latest.yml/badge.svg?branch=main)](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/windows-latest.yml)
[![Discord][discord-badge]][discord]
[![Node Support](https://img.shields.io/badge/node-%3E12.x-brightgreen.svg)](https://github.com/nightwatchjs/nightwatch/blob/27a855a2ec0c2008073708d5a2286c2819584fdc/.github/workflows/build-node.yaml#L19)

#### [Homepage](https://nightwatchjs.org) &bullet; [Developer Guide](https://nightwatchjs.org/guide) &bullet; [API Reference](https://nightwatchjs.org/api) &bullet; [About](https://nightwatchjs.org/about) &bullet; [Blog](https://nightwatchjs.org/blog)

## Get started in 60 seconds
![nightwatch-cli-gif](https://user-images.githubusercontent.com/39924567/174841680-59664ff6-da2d-44a3-a1df-52d22c69b1e2.gif)

---

#### 1. Install Nightwatch from NPM

```sh
# from your existing project's root dir
$ npm init nightwatch

# if you want to initialize a new project
$ npm init nightwatch path/to/new/project

# if you just want to generate a new config
# file in your existing Nightwatch project
$ npm init nightwatch -- --generate-config
```

#### 2. Answer a few questions about your preferred setup:

- What is your Language - Test Runner setup? 
- Where do you want to run your e2e tests? 
- Where you'll be testing on? 
- Where do you plan to keep your end-to-end tests? 
- What is the base_url of your project? 

Nightwatch will do the entire setup for you based on your answers.

#### 3. Run a Demo Test:

Nightwatch comes with a few examples, which are automatically copied to your Nightwatch project during the setup and can also be used as boilerplate to write your own tests on top of them.

You can follow the instructions given at the end of the setup to run your first test with Nightwatch.

<img width="413" alt="image" src="https://user-images.githubusercontent.com/39924567/174763723-aff4d501-6320-402c-81cc-de75fbb5e8f0.png">


## Licence
[MIT](https://github.com/nightwatchjs/nightwatch/blob/main/LICENSE.md)

[discord-badge]: https://img.shields.io/discord/618399631038218240.svg?color=7389D8&labelColor=6A7EC2&logo=discord&logoColor=ffffff&style=flat-square
[discord]: https://discord.gg/SN8Da2X
