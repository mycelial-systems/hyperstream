import http from 'http'
import https from 'https'
import { Duplex, PassThrough } from 'stream'
import { URL } from 'url'

interface HyperquestOptions {
    method?: string
    headers?: Record<string, string>
    [key: string]: any
}

function hyperquest(
    uri: string | URL,
    opts?: HyperquestOptions
): Duplex | PassThrough {
    const options = opts || {}
    const method = (options.method || 'GET').toUpperCase()

    const parsedUrl = typeof uri === 'string' ? new URL(uri) : uri
    const isSecure = parsedUrl.protocol === 'https:'
    const client = isSecure ? https : http

    const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: options.headers || {},
        ...options
    }

    if (method === 'GET' || method === 'DELETE') {
        // Return a readable stream
        const stream = new PassThrough()

        const req = client.request(requestOptions, (res) => {
            res.pipe(stream)
        })

        req.on('error', (err) => {
            stream.destroy(err)
        })

        req.end()

        return stream
    } else {
        // Return a duplex stream for POST, PUT, etc.
        const stream = new PassThrough()

        const req = client.request(requestOptions, (res) => {
            res.pipe(stream)
        })

        req.on('error', (err) => {
            stream.destroy(err)
        })

        // Pipe the input stream to the request
        stream.pipe(req)

        return stream
    }
}

export default hyperquest
