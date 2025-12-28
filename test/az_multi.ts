import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { createAzStream, fileToStream, processFile } from './helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const expected = fs.readFileSync(path.join(__dirname, 'az_multi', 'expected.html'), 'utf8')

test('fs stream and a slow stream', async function (t) {
    const hs = hyperstream({
        '#a': createAzStream(),
        '#b': fileToStream(path.join(__dirname, 'az_multi', 'b.html')),
        '#c': createAzStream(),
        '#d': fileToStream(path.join(__dirname, 'az_multi', 'd.html'))
    })

    const result = await processFile(hs, path.join(__dirname, 'az_multi', 'index.html'))
    t.equal(result, expected)
})
