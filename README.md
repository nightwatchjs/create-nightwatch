# create-nightwatch

The Nightwatch CLI tool lets you setup Nightwatch.js in your new or existing project, with all the required configs and dependencies, with just one command.

[![npm](https://img.shields.io/npm/v/nightwatch.svg)](https://www.npmjs.com/package/nightwatch)
[![Node.js CI](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/ubuntu-latest.yml/badge.svg?branch=main)](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/ubuntu-latest.yml)
[![Node.js CI](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/windows-latest.yml/badge.svg?branch=main)](https://github.com/nightwatchjs/create-nightwatch/actions/workflows/windows-latest.yml)
[![Discord][discord-badge]][discord]
[![Node Support](https://img.shields.io/badge/node-%3E12.x-brightgreen.svg)](https://github.com/nightwatchjs/nightwatch/blob/27a855a2ec0c2008073708d5a2286c2819584fdc/.github/workflows/build-node.yaml#L19)

#### [Homepage](https://nightwatchjs.org) &bullet; [Developer Guide](https://nightwatchjs.org/guide) &bullet; [API Reference](https://nightwatchjs.org/api) &bullet; [About](https://nightwatchjs.org/about) &bullet; [Blog](https://nightwatchjs.org/blog)

## Get started in 60 seconds
![nightwatch-cli-gif](https://user-images.githubusercontent.com/2018070/170960356-6f80d072-3bea-4f90-a86f-b6307e6dfc67.gif)

---

#### 1. Install Nightwatch from NPM

```sh
# from your existing project's root dir
$ npm init nightwatch

# if you want to initialize a new project
$ npm init nightwatch path/to/new/project
```

#### 2. Answer a few questions about your preferred setup:

- What is your Language - Test Runner setup? 
- Where do you want to run your e2e tests? 
- Where you'll be testing on? 
- Where do you plan to keep your end-to-end tests? 
- What is the base_url of your project? 

Nightwatch will do the entire setup for you based on your answers.

#### 3. Run a Demo Test:

Nightwatch comes with an `examples` folder containing several sample tests.

Below will run a basic test which opens the search engine [Ecosia.org](https://ecosia.org), searches for the term "nightwatch", and verifies if the term first result is the Nightwatch.js website.

```sh
$ npx nightwatch examples/tests/ecosia.js
```

## Licence
[MIT](https://github.com/nightwatchjs/nightwatch/blob/main/LICENSE.md)

[discord-badge]: https://img.shields.io/discord/618399631038218240.svg?color=7389D8&labelColor=6A7EC2&logo=discord&logoColor=ffffff&style=flat-square
[discord]: https://discord.gg/SN8Da2X
