import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import fs from 'fs'
import { fileURLToPath } from 'node:url'
import path from 'path'
import { fileToStream, processFile } from './helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const expected = fs.readFileSync(__dirname + '/string/expected.html', 'utf8')

test('glue html streams from disk', async function (t) {
    const hs = hyperstream({
        '#a': fileToStream(__dirname + '/string/a.html'),
        '#b': fileToStream(__dirname + '/string/b.html'),
        'head title': 'beep boop',
        '#c span': function (html) { return html.toUpperCase() }
    })

    const result = await processFile(hs, __dirname + '/string/index.html')
    t.equal(result, expected)
})
