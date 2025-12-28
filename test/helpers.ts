import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Convert a string to a ReadableStream of bytes
 */
export function stringToStream (str: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start (controller) {
            controller.enqueue(encoder.encode(str))
            controller.close()
        }
    })
}

/**
 * Read a file and return a web ReadableStream
 */
export function fileToStream (filepath: string): ReadableStream<Uint8Array> {
    const content = fs.readFileSync(filepath)
    return new ReadableStream({
        start (controller) {
            controller.enqueue(new Uint8Array(content))
            controller.close()
        }
    })
}

/**
 * Consume a ReadableStream and return the data as a string
 */
export async function streamToString (stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
    }

    const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
    }

    return decoder.decode(result)
}

/**
 * Run html through hyperstream and return the result as a string
 */
export async function processHtml (
    hs: { transform: TransformStream<Uint8Array, Uint8Array> },
    html: string
): Promise<string> {
    const input = stringToStream(html)
    const output = input.pipeThrough(hs.transform)
    return streamToString(output)
}

/**
 * Run a file through hyperstream and return the result as a string
 */
export async function processFile (
    hs: { transform: TransformStream<Uint8Array, Uint8Array> },
    filepath: string
): Promise<string> {
    const input = fileToStream(filepath)
    const output = input.pipeThrough(hs.transform)
    return streamToString(output)
}

/**
 * Create a delayed stream that emits characters one by one with a delay
 */
export function createDelayedStream (chars: string, delayMs: number): ReadableStream<Uint8Array> {
    let index = 0
    return new ReadableStream({
        async pull (controller) {
            if (index < chars.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs))
                controller.enqueue(encoder.encode(chars[index]))
                index++
            } else {
                controller.close()
            }
        }
    })
}

/**
 * Create an A-Z stream (letters a-z with delays)
 */
export function createAzStream (delayMs = 25): ReadableStream<Uint8Array> {
    return createDelayedStream('abcdefghijklmnopqrstuvwxyz', delayMs)
}
