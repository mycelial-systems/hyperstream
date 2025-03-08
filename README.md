# hyperstream
![tests](https://github.com/bicycle-codes/crypto-util/actions/workflows/nodejs.yml/badge.svg)
[![types](https://img.shields.io/npm/types/@substrate-system/icons?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/hyperstream)](https://packagephobia.com/result?p=@substrate-system/hyperstream)
[![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat-square)](package.json)
[![license](https://img.shields.io/badge/license-Polyform_Non_Commercial-26bc71?style=flat-square)](LICENSE)


Stream html into html at a css selector.

A re-implementation of the classic [@substack module](https://www.npmjs.com/package/hyperstream).

<details><summary><h2>Contents</h2></summary>
<!-- toc -->
</details>

## Install

```sh
npm i -S @substrate-system/hyperstream
```

## Modules
This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports). If you are using a bundler, then just import/require
as normal.

### ESM

```js
import { hyperstream } from '@substrate-system/hyperstream'
```

### Common JS
```js
const hyperstream = require('@substrate-system/hyperstream')
```

### pre-built JS
This package exposes minified JS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/@substrate-system/hyperstream/dist/index.min.js ./public/hyperstream.min.js
```

#### HTML
```html
<script type="module" src="./hyperstream.min.js"></script>
```

## Example

```js
import { hyperstream } from '@substrate-system/hyperstream'

```
