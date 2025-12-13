import { Transform } from 'node:stream'
import type { TransformCallback, Readable } from 'node:stream'
import { selectAll } from 'css-select'
import { parseDocument } from 'htmlparser2'
import type { Element } from 'domhandler'
import { Tokenize } from './tokenize.js'
import { encode as entEncode } from './ent/index.js'

type StreamValue = Readable & { pipe:(...args: unknown[]) => unknown }
type TransformFn = (html:string) => string
type AttrModifier = { append?:string; prepend?:string }

type PropertyValue =
    | string
    | Buffer
    | number
    | StreamValue
    | AttrModifier

type SelectorValue =
    | string
    | Buffer
    | number
    | null
    | StreamValue
    | TransformFn
    | Record<string, PropertyValue>

interface HyperstreamConfig {
    [selector: string]: SelectorValue
}

interface MatchedElement {
    selector:string
    value:SelectorValue
    depth:number
    openTag:Buffer
    content:Array<Buffer|Promise<Buffer>>
    closeTag:Buffer|null
    firstOnly:boolean
}

function isStream (s:unknown):s is StreamValue {
    return (s !== null &&
        typeof s === 'object' &&
        typeof (s as any).pipe === 'function')
}

function isObj (o:unknown):o is Record<string, unknown> {
    return (typeof o === 'object' &&
        o !== null &&
        !Buffer.isBuffer(o) &&
        !isStream(o)
    )
}

function toStr (s:unknown):string {
    if (Buffer.isBuffer(s)) return s.toString('utf8')
    if (typeof s === 'string') return s
    return String(s)
}

function parseTagAttrs (tagBuf:Buffer):Record<string, string> {
    const tag = tagBuf.toString('utf8')
    const attrs:Record<string, string> = {}
    const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
    let match:RegExpExecArray | null

    const tagMatch = tag.match(/^<\/?([a-zA-Z][-a-zA-Z0-9]*)/)
    const startIndex = tagMatch ? tagMatch[0].length : 1
    const attrPart = tag.slice(startIndex)

    while ((match = attrRegex.exec(attrPart)) !== null) {
        const name = match[1].toLowerCase()
        const value = match[2] ?? match[3] ?? match[4] ?? ''
        attrs[name] = value
    }

    return attrs
}

function rebuildTag (
    tagBuf:Buffer,
    attrChanges:Record<string, string | null>
):Buffer {
    const tag = tagBuf.toString('utf8')
    const tagMatch = tag.match(/^<([a-zA-Z][-a-zA-Z0-9]*)/)
    if (!tagMatch) return tagBuf

    const tagName = tagMatch[1]
    const existingAttrs = parseTagAttrs(tagBuf)

    for (const [key, value] of Object.entries(attrChanges)) {
        if (value === null) {
            delete existingAttrs[key.toLowerCase()]
        } else {
            existingAttrs[key.toLowerCase()] = value
        }
    }

    const selfClosing = tag.trimEnd().endsWith('/>')
    let result = '<' + tagName
    for (const [key, value] of Object.entries(existingAttrs)) {
        result += ` ${key}="${value.replace(/"/g, '&quot;')}"`
    }
    result += selfClosing ? ' />' : '>'

    return Buffer.from(result)
}

function getTagName (tagBuf: Buffer): string {
    const tag = tagBuf.toString('utf8')
    const match = tag.match(/^<\/?([a-zA-Z][-a-zA-Z0-9]*)/)
    return match ? match[1].toLowerCase() : ''
}

function isSelfClosing (tagBuf: Buffer): boolean {
    const tag = tagBuf.toString('utf8').trim()
    return tag.endsWith('/>') || isVoidElement(getTagName(tagBuf))
}

const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
])

function isVoidElement (tagName: string): boolean {
    return VOID_ELEMENTS.has(tagName.toLowerCase())
}

function matchesSelector (
    tagBuf: Buffer,
    selector: string,
    ancestors: Buffer[]
): boolean {
    const tagName = getTagName(tagBuf)
    const attrs = parseTagAttrs(tagBuf)

    let html = ''
    for (const ancestorBuf of ancestors) {
        const name = getTagName(ancestorBuf)
        const ancestorAttrs = parseTagAttrs(ancestorBuf)
        html += `<${name}`
        for (const [k, v] of Object.entries(ancestorAttrs)) {
            html += ` ${k}="${v}"`
        }
        html += '>'
    }

    html += `<${tagName}`
    for (const [k, v] of Object.entries(attrs)) {
        html += ` ${k}="${v}"`
    }
    html += `></${tagName}>`

    for (let i = ancestors.length - 1; i >= 0; i--) {
        const name = getTagName(ancestors[i])
        html += `</${name}>`
    }

    try {
        const doc = parseDocument(html)
        const elements = selectAll(selector, doc) as unknown as Element[]
        if (elements.length > 0) {
            const last = elements[elements.length - 1]
            return last.name === tagName
        }
        return false
    } catch {
        return false
    }
}

class Hyperstream extends Transform {
    private tokenize: Tokenize
    private selectors: Array<{
        selector: string
        value: SelectorValue
        firstOnly: boolean
        matchedOnce: boolean
    }>

    private ancestors: Buffer[] = []
    private activeMatches: MatchedElement[] = []
    private depth = 0
    private outputQueue: Array<Buffer | Promise<Buffer>> = []
    private flushCallback: TransformCallback | null = null
    private inputEnded = false
    private flushing = false

    constructor (config: HyperstreamConfig = {}) {
        super()
        this.tokenize = new Tokenize()

        this.selectors = Object.keys(config).map(key => {
            const firstOnly = /:first$/.test(key)
            return {
                selector: key.replace(/:first$/, ''),
                value: config[key],
                firstOnly,
                matchedOnce: false
            }
        })

        this.tokenize.on('data', (token: [string, Buffer]) => {
            this.processToken(token)
        })

        this.tokenize.on('end', () => {
            this.inputEnded = true
            this.tryFlush()
        })
    }

    private queueOutput (data: Buffer | Promise<Buffer>): void {
        if (this.activeMatches.length > 0) {
            const parent = this.activeMatches[this.activeMatches.length - 1]
            parent.content.push(data)
        } else {
            this.outputQueue.push(data)
            if (!this.flushing) {
                this.tryFlush()
            }
        }
    }

    private async tryFlush (): Promise<void> {
        if (this.flushing) return
        this.flushing = true

        try {
            while (this.outputQueue.length > 0) {
                const first = this.outputQueue[0]
                let buf: Buffer
                if (first instanceof Promise) {
                    buf = await first
                } else {
                    buf = first
                }
                this.outputQueue.shift()
                this.push(buf)
            }

            if (this.inputEnded && this.outputQueue.length === 0 && this.flushCallback) {
                const cb = this.flushCallback
                this.flushCallback = null
                cb()
            }
        } finally {
            this.flushing = false
        }
    }

    private processToken (token: [string, Buffer]): void {
        const [type, data] = token

        if (type === 'open') {
            this.handleOpenTag(data)
        } else if (type === 'close') {
            this.handleCloseTag(data)
        } else if (type === 'text') {
            this.queueOutput(data)
        }
    }

    private handleOpenTag (tagBuf: Buffer): void {
        const selfClosing = isSelfClosing(tagBuf)

        for (const sel of this.selectors) {
            if (sel.value === null) continue
            if (sel.firstOnly && sel.matchedOnce) continue

            if (matchesSelector(tagBuf, sel.selector, this.ancestors)) {
                sel.matchedOnce = true

                const match: MatchedElement = {
                    selector: sel.selector,
                    value: sel.value,
                    depth: this.depth,
                    openTag: tagBuf,
                    content: [],
                    closeTag: null,
                    firstOnly: sel.firstOnly
                }

                if (selfClosing) {
                    this.processMatch(match)
                } else {
                    this.activeMatches.push(match)
                    this.ancestors.push(tagBuf)
                    this.depth++
                }
                return
            }
        }

        this.queueOutput(tagBuf)

        if (!selfClosing) {
            this.ancestors.push(tagBuf)
            this.depth++
        }
    }

    private handleCloseTag (tagBuf: Buffer): void {
        this.depth--
        if (this.ancestors.length > 0) {
            this.ancestors.pop()
        }

        if (this.activeMatches.length > 0) {
            const match = this.activeMatches[this.activeMatches.length - 1]
            if (this.depth === match.depth) {
                match.closeTag = tagBuf
                this.activeMatches.pop()
                this.processMatch(match)
                return
            }
        }

        this.queueOutput(tagBuf)
    }

    private async resolveContent (content: Array<Buffer | Promise<Buffer>>): Promise<Buffer> {
        const resolved = await Promise.all(content)
        return Buffer.concat(resolved)
    }

    private processMatch (match: MatchedElement): void {
        const { value, openTag, content, closeTag } = match

        // Check if content has any promises
        const hasPromises = content.some(c => c instanceof Promise)

        if (hasPromises) {
            // Need to resolve content asynchronously
            const resultPromise = this.resolveContent(content).then(originalContent => {
                return this.transformContent(value, openTag, originalContent, closeTag)
            })
            this.queueOutput(resultPromise)
        } else {
            // All content is resolved
            const originalContent = Buffer.concat(content as Buffer[])
            const result = this.transformContent(value, openTag, originalContent, closeTag)
            if (result instanceof Promise) {
                this.queueOutput(result)
            } else {
                this.queueOutput(result)
            }
        }
    }

    private transformContent (
        value: SelectorValue,
        openTag: Buffer,
        originalContent: Buffer,
        closeTag: Buffer | null
    ): Buffer | Promise<Buffer> {
        if (typeof value === 'string') {
            return this.buildOutput(openTag, Buffer.from(value), closeTag, {})
        } else if (typeof value === 'number') {
            return this.buildOutput(openTag, Buffer.from(String(value)), closeTag, {})
        } else if (Buffer.isBuffer(value)) {
            return this.buildOutput(openTag, value, closeTag, {})
        } else if (typeof value === 'function') {
            const result = value(originalContent.toString('utf8'))
            return this.buildOutput(openTag, Buffer.from(toStr(result)), closeTag, {})
        } else if (isStream(value)) {
            return this.streamToBuffer(value).then(buf => {
                return this.buildOutput(openTag, buf, closeTag, {})
            })
        } else if (isObj(value)) {
            return this.processObjectValueSync(openTag, originalContent, closeTag, value as Record<string, PropertyValue>)
        } else {
            const parts = [openTag, originalContent]
            if (closeTag) parts.push(closeTag)
            return Buffer.concat(parts)
        }
    }

    private processObjectValueSync (
        openTag: Buffer,
        originalContent: Buffer,
        closeTag: Buffer | null,
        props: Record<string, PropertyValue>
    ): Buffer | Promise<Buffer> {
        let newContent: Buffer | null = null
        let pendingContent: Promise<Buffer> | null = null
        const attrChanges: Record<string, string | null> = {}

        for (const [prop, v] of Object.entries(props)) {
            const lprop = prop.toLowerCase()

            if (prop === '_html') {
                if (isStream(v)) {
                    pendingContent = this.streamToBuffer(v)
                } else {
                    newContent = Buffer.from(toStr(v))
                }
            } else if (prop === '_text') {
                if (isStream(v)) {
                    pendingContent = this.streamToBuffer(v).then(buf =>
                        Buffer.from(entEncode(buf.toString('utf8')))
                    )
                } else {
                    newContent = Buffer.from(entEncode(toStr(v)))
                }
            } else if (lprop === '_appendhtml') {
                if (isStream(v)) {
                    pendingContent = this.streamToBuffer(v).then(buf =>
                        Buffer.concat([originalContent, buf])
                    )
                } else {
                    newContent = Buffer.concat([originalContent, Buffer.from(toStr(v))])
                }
            } else if (lprop === '_prependhtml') {
                if (isStream(v)) {
                    pendingContent = this.streamToBuffer(v).then(buf =>
                        Buffer.concat([buf, originalContent])
                    )
                } else {
                    newContent = Buffer.concat([Buffer.from(toStr(v)), originalContent])
                }
            } else if (prop === '_append' || lprop === '_appendtext') {
                if (isStream(v)) {
                    pendingContent = this.streamToBuffer(v).then(buf =>
                        Buffer.concat([originalContent, Buffer.from(entEncode(buf.toString('utf8')))])
                    )
                } else {
                    newContent = Buffer.concat([originalContent, Buffer.from(entEncode(toStr(v)))])
                }
            } else if (prop === '_prepend' || lprop === '_prependtext') {
                if (isStream(v)) {
                    pendingContent = this.streamToBuffer(v).then(buf =>
                        Buffer.concat([Buffer.from(entEncode(buf.toString('utf8'))), originalContent])
                    )
                } else {
                    newContent = Buffer.concat([Buffer.from(entEncode(toStr(v))), originalContent])
                }
            } else {
                if (isObj(v) && ('append' in v || 'prepend' in v)) {
                    const modifier = v as AttrModifier
                    const currentAttrs = parseTagAttrs(openTag)
                    let current = currentAttrs[prop.toLowerCase()] || ''
                    if (modifier.append) current += modifier.append
                    if (modifier.prepend) current = modifier.prepend + current
                    attrChanges[prop] = current
                } else if (v === null || v === undefined) {
                    attrChanges[prop] = null
                } else {
                    attrChanges[prop] = toStr(v)
                }
            }
        }

        if (pendingContent) {
            return pendingContent.then(buf => {
                return this.buildOutput(openTag, buf, closeTag, attrChanges)
            })
        } else {
            const finalContent = newContent ?? originalContent
            return this.buildOutput(openTag, finalContent, closeTag, attrChanges)
        }
    }

    private streamToBuffer (stream: StreamValue): Promise<Buffer> {
        return new Promise((resolve) => {
            const chunks: Buffer[] = []
            stream.on('data', (chunk: Buffer) =>
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            )
            stream.on('end', () => resolve(Buffer.concat(chunks)))
        })
    }

    private buildOutput (
        openTag: Buffer,
        content: Buffer,
        closeTag: Buffer | null,
        attrChanges: Record<string, string | null>
    ): Buffer {
        const modifiedTag = Object.keys(attrChanges).length > 0
            ? rebuildTag(openTag, attrChanges)
            : openTag

        const parts = [modifiedTag, content]
        if (closeTag) parts.push(closeTag)
        return Buffer.concat(parts)
    }

    override _transform (
        chunk: Buffer,
        encoding: BufferEncoding,
        callback: TransformCallback
    ): void {
        this.tokenize.write(chunk, encoding, callback)
    }

    override _flush (callback: TransformCallback): void {
        this.tokenize.end()

        if (this.outputQueue.length === 0) {
            callback()
        } else {
            this.flushCallback = callback
            this.tryFlush()
        }
    }
}

export default function hyperstream (config?: HyperstreamConfig): Hyperstream {
    return new Hyperstream(config)
}

export { Hyperstream }
