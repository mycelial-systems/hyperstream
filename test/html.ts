import hyperstream from '../src/index.js'
import { test } from '@substrate-system/tapzero'
import { processHtml, stringToStream } from './helpers.js'

test('string _html', async function (t) {
    const hs = hyperstream({
        '.row': { _html: '<b>beep boop</b>' }
    })

    const result = await processHtml(hs, '<div class="row"></div>')
    t.equal(result, '<div class="row"><b>beep boop</b></div>')
})

test('stream _html', async function (t) {
    const stream = stringToStream('<b>beep boop</b>')

    const hs = hyperstream({
        '.row': { _html: stream }
    })

    const result = await processHtml(hs, '<div class="row"></div>')
    t.equal(result, '<div class="row"><b>beep boop</b></div>')
})
