# hyperstream
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/hyperstream/nodejs.yml?style=flat-square)](https://github.com/substrate-system/hyperstream/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/hyperstream?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/hyperstream)](https://packagephobia.com/result?p=@substrate-system/hyperstream)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


Use CSS selectors & HTML as a template language.

A re-implementation of the classic
[@substack module](https://www.npmjs.com/package/hyperstream).

<details><summary><h2>Contents</h2></summary>
<!-- toc -->
</details>

## Install

```sh
npm i -S @substrate-system/hyperstream
```

## Example

Take some template HTML, and pipe more HTML into it with CSS selectors.

### Strings

Can also use strings directly.

```ts
import hyperstream from '@substrate-system/hyperstream'

const hs = hyperstream({
    '#title': 'Hello World',
    '.content': { _html: '<p>This is the content</p>' }
})

hs.pipe(process.stdout)
hs.end('<html><head><title id="title"></title></head><body><div class="content"></div></body></html>')
```

Output:
```html
<html>
    <head><title id="title">Hello World</title></head>
    <body>
        <div class="content"><p>This is the content</p></div>
    </body>
</html>
```

#### Append and prepend

Use `_appendHtml`, `_prependHtml`, `_append` (text), or `_prepend` (text)
to add content before or after existing content:

```ts
import hyperstream from '@substrate-system/hyperstream'

const hs = hyperstream({
    '.list': { _appendHtml: '<li>New item</li>' },
    '.greeting': { _prepend: 'Hello, ' }
})

hs.pipe(process.stdout)
hs.end('<ul class="list"><li>First</li></ul><span class="greeting">World</span>')
```

Output:
```html
<ul class="list"><li>First</li><li>New item</li></ul><span class="greeting">Hello, World</span>
```

### Streams

Pass a stream as the value to insert streamed content:

```ts
import hyperstream from '@substrate-system/hyperstream'
import { createReadStream } from 'node:fs'

const hs = hyperstream({
    '#a': createReadStream('./content-a.html'),
    '#b': createReadStream('./content-b.html')
})

createReadStream('./template.html')  // template file
    .pipe(hs)  // pipe through our content addition stream
    .pipe(process.stdout)  // result is template.html with new content
```

### Attribute manipulation

Set attributes directly, or use `append`/`prepend` to modify existing values:

```ts
import hyperstream from '@substrate-system/hyperstream'

const hs = hyperstream({
    'input': { value: 'default', placeholder: 'Enter text...' },
    '.btn': { class: { append: ' active' } },
    'a': { href: 'https://example.com' }
})

hs.pipe(process.stdout)
hs.end('<input><button class="btn">Click</button><a>Link</a>')
```

Output:
```html
<input value="default" placeholder="Enter text..."><button class="btn active">Click</button><a href="https://example.com">Link</a>
```

### Transform functions

Pass a function to transform the existing content:

```ts
import hyperstream from '@substrate-system/hyperstream'

const hs = hyperstream({
    '.count': (html) => String(parseInt(html) + 1),
    '.upper': (html) => html.toUpperCase()
})

hs.pipe(process.stdout)
hs.end('<span class="count">41</span><span class="upper">hello</span>')
```

Output:
```html
<span class="count">42</span><span class="upper">HELLO</span>
```
