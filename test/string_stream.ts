import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import { processHtml, createDelayedStream } from './helpers.js'

test('string before a stream', async function (t) {
    const SIZE = 50
    const stream = createDelayedStream('onetwothreefourfive', 15)

    const hs = hyperstream({
        '.a': Array(SIZE).join('THEBEST'),
        '.b': stream
    })

    const result = await processHtml(hs, '<div class="a"></div><div class="b"></div>')
    t.equal(result, [
        '<div class="a">' + Array(SIZE).join('THEBEST') + '</div>',
        '<div class="b">onetwothreefourfive</div>'
    ].join(''))
})
