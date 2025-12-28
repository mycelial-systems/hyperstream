import hyperstream from '../src/index.js'
import { test } from '@substrate-system/tapzero'
import { processHtml } from './helpers.js'

test('null value', async function (t) {
    const hs = hyperstream({
        '.row': null
    })

    const result = await processHtml(hs, '<div class="row"></div>')
    t.equal(result, '<div class="row"></div>')
})
