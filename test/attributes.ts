import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import { processHtml } from './helpers.js'

const src = '<div><input value=""><span></span></div>'
const expected = '<div><input value="value"><span class="class"></span></div>'

test('attributes', async function (t) {
    const hs = hyperstream({
        input: { value: 'value' },
        span: { class: 'class' }
    })

    const result = await processHtml(hs, src)
    t.equal(result, expected)
})
