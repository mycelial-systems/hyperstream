import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { fileToStream, processFile } from './helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const expected = fs.readFileSync(path.join(__dirname, 'hs', 'expected.html'), 'utf8')

test('glue html streams from disk', async function (t) {
    const hs = hyperstream({
        '#a': fileToStream(path.join(__dirname, 'hs', 'a.html')),
        '#b': fileToStream(path.join(__dirname, 'hs', 'b.html'))
    })

    const result = await processFile(hs, path.join(__dirname, 'hs', 'index.html'))
    t.equal(result, expected)
})
