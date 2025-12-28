import hyperstream from '../src/index.js'
import { test } from '@substrate-system/tapzero'
import { processHtml, stringToStream } from './helpers.js'
import ent from '../src/ent/index.js'

test('string _text', async function (t) {
    const hs = hyperstream({
        '.row': { _text: '<b>beep boop</b>' }
    })

    const result = await processHtml(hs, '<div class="row"></div>')
    t.equal(result, '<div class="row">' + ent.encode('<b>beep boop</b>') + '</div>')
})

test('stream _text', async function (t) {
    const stream = stringToStream('<b>beep boop</b>')

    const hs = hyperstream({
        '.row': { _text: stream }
    })

    const result = await processHtml(hs, '<div class="row"></div>')
    t.equal(result, '<div class="row">' + ent.encode('<b>beep boop</b>') + '</div>')
})
