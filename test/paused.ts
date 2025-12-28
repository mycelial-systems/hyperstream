import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { processFile } from './helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const expected = fs.readFileSync(path.join(__dirname, 'none', 'index.html'), 'utf8')

test('process file through hyperstream', async function (t) {
    // Note: Web Streams handle backpressure differently than Node streams.
    // This test verifies that file processing works correctly.
    const hs = hyperstream({})
    const result = await processFile(hs, path.join(__dirname, 'none', 'index.html'))
    t.equal(result, expected)
})
