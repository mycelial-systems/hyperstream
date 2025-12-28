import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { processFile } from './helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filepath = path.join(__dirname, 'num', 'expected.html')
const expected = fs.readFileSync(filepath, 'utf8')

test('num', async function (t) {
    const hs = hyperstream({
        '#a': '5',
        '#b': '6',
        '#c': { n: 123 },
        '#c span': function (html) { return '' + html.length }
    })

    const result = await processFile(hs, path.join(__dirname, 'num', 'index.html'))
    t.equal(result, expected)
})
