import { test } from '@substrate-system/tapzero'
import hyperstream from '../src/index.js'
import { processHtml, createDelayedStream, streamToString, stringToStream } from './helpers.js'

const encoder = new TextEncoder()

test('queue an empty string', async function (t) {
    // Create a stream that emits: 'xy', '', 'z' with delays
    const stream = new ReadableStream<Uint8Array>({
        async start (controller) {
            await new Promise(r => setTimeout(r, 25))
            controller.enqueue(encoder.encode('xy'))
            await new Promise(r => setTimeout(r, 25))
            controller.enqueue(encoder.encode(''))
            await new Promise(r => setTimeout(r, 25))
            controller.enqueue(encoder.encode('z'))
            controller.close()
        }
    })

    const hs = hyperstream({ '.a': stream })
    const result = await processHtml(hs, '<div class="a"></div>')
    t.equal(result, '<div class="a">xyz</div>')
})
