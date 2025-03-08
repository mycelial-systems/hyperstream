import { type TransformCallback, Transform } from 'node:stream'

const codes = {
    lt: '<'.charCodeAt(0),
    gt: '>'.charCodeAt(0),
    slash: '/'.charCodeAt(0),
    dquote: '"'.charCodeAt(0),
    squote: "'".charCodeAt(0),
    equal: '='.charCodeAt(0)
}

const strings = {
    endScript: Buffer.from('</script'),
    endStyle: Buffer.from('</style'),
    endTitle: Buffer.from('</title'),
    comment: Buffer.from('<!--'),
    endComment: Buffer.from('-->'),
    cdata: Buffer.from('<![CDATA['),
    endCdata: Buffer.from(']]>')
}

const states = {
    TagNameState: 1,
    AttributeNameState: 2,
    BeforeAttributeValueState: 3,
    AttributeValueState: 4
}

/**
 * Transform stream to tokenize html
 */
export class Tokenize extends Transform {
    state
    tagState
    quoteState
    raw
    buffers
    _offset?:number
    private _prev?:null|Buffer
    private _last

    constructor () {
        super({ objectMode: true })

        this.state = 'text'
        this.tagState = null
        this.quoteState = null
        this.raw = null
        this.buffers = []
        this._last = []
    }

    _pushState (ev) {
        if (this.buffers.length === 0) return
        const buf = Buffer.concat(this.buffers)
        this.buffers = []
        this.push([ev, buf])
    }

    _getChar (i:number) {
        let offset = 0
        for (let j = 0; j < this.buffers.length; j++) {
            const buf = this.buffers[j]
            if (offset + buf.length > i) {
                return buf[i - offset]
            }
            offset += buf
        }
    }

    _getTag () {
        let offset = 0
        let tag = ''
        for (let j = 0; j < this.buffers.length; j++) {
            const buf = this.buffers[j]
            for (let k = 0; k < buf.length; k++) {
                if (offset === 0 && k === 0) continue
                const c = String.fromCharCode(buf[k])
                if (/[^\w-![\]]/.test(c)) {
                    return tag.toLowerCase()
                } else tag += c
            }
            offset += buf.length
        }
    }

    _testRaw (buf:Buffer, offset:number, index:number) {
        const raw = this.raw
        const last = this._last
        if (!compare(last, raw)) return

        this.buffers.push(buf.slice(offset, index + 1))
        // var buf = Buffer.concat(this.buffers)
        const _buf = Buffer.concat(this.buffers)
        const k = _buf.length - raw.length
        return [_buf.slice(0, k), _buf.slice(k)]
    }

    _transform (
        buf:Buffer,
        enc:BufferEncoding,
        next:TransformCallback
    ):void {
        let i = 0
        let offset:number|undefined = 0

        if (this._prev) {
            buf = Buffer.concat([this._prev, buf])
            i = this._prev.length - 1
            offset = this._offset || 0
            this._prev = null
            this._offset = 0
        }

        for (; i < buf.length; i++) {
            const b = buf[i]
            this._last.push(b)
            if (this._last.length > 9) this._last.shift()
            // detect end of raw character mode (comment, script,..)
            if (this.raw) {
                const parts = this._testRaw(buf, offset, i)
                if (parts) {
                    this.push(['text', parts[0]])

                    if (
                        this.raw === strings.endComment ||
                        this.raw === strings.endCdata
                    ) {
                        this.state = 'text'
                        this.buffers = []
                        this.push(['close', parts[1]])
                    } else {
                        this.state = 'open'
                        this.buffers = [parts[1]]
                    }

                    this.raw = null
                    offset = i + 1
                }
            // ask for more data if last byte is '<'
            } else if (
                this.state === 'text' && b === codes.lt &&
                i === buf.length - 1
            ) {
                this._prev = buf
                this._offset = offset
                return next()
            // detect a tag opening
            } else if (
                this.state === 'text' && b === codes.lt &&
                !isWhiteSpace(buf[i + 1])
            ) {
                if (i > 0 && i - offset > 0) {
                    this.buffers.push(buf.slice(offset, i))
                }
                offset = i
                this.state = 'open'
                this.tagState = states.TagNameState
                this._pushState('text')
            } else if (
                this.tagState === states.TagNameState &&
                isWhiteSpace(b)
            ) {
                this.tagState = states.AttributeNameState
            } else if (
                this.tagState === states.AttributeNameState &&
                b === codes.equal
            ) {
                this.tagState = states.BeforeAttributeValueState
            } else if (
                this.tagState === states.BeforeAttributeValueState &&
                isWhiteSpace(b)
            ) {
                // do nothing
            } else if (
                this.tagState === states.BeforeAttributeValueState &&
                b !== codes.gt
            ) {
                this.tagState = states.AttributeValueState
                if (b === codes.dquote) {
                    this.quoteState = 'double'
                } else if (b === codes.squote) {
                    this.quoteState = 'single'
                } else {
                    this.quoteState = null
                }
            } else if (
                this.tagState === states.AttributeValueState &&
                !this.quoteState &&
                isWhiteSpace(b)
            ) {
                this.tagState = states.AttributeNameState
            } else if (
                this.tagState === states.AttributeValueState &&
                this.quoteState === 'double' &&
                b === codes.dquote
            ) {
                this.quoteState = null
                this.tagState = states.AttributeNameState
            } else if (
                this.tagState === states.AttributeValueState &&
                this.quoteState === 'single' &&
                b === codes.squote
            ) {
                this.quoteState = null
                this.tagState = states.AttributeNameState
            } else if (
                this.state === 'open' &&
                b === codes.gt && !this.quoteState
            ) {
                this.buffers.push(buf.slice(offset, i + 1))
                offset = i + 1
                this.state = 'text'
                this.tagState = null
                if (this._getChar(1) === codes.slash) {
                    this._pushState('close')
                } else {
                    const tag = this._getTag()
                    if (tag === 'script') this.raw = strings.endScript
                    if (tag === 'style') this.raw = strings.endStyle
                    if (tag === 'title') this.raw = strings.endTitle
                    this._pushState('open')
                }
            } else if (
                this.state === 'open' &&
                compare(this._last, strings.comment)
            ) {
                this.buffers.push(buf.slice(offset, i + 1))
                offset = i + 1
                this.state = 'text'
                this.raw = strings.endComment
                this._pushState('open')
            } else if (
                this.state === 'open' &&
                compare(this._last, strings.cdata)
            ) {
                this.buffers.push(buf.slice(offset, i + 1))
                offset = i + 1
                this.state = 'text'
                this.raw = strings.endCdata
                this._pushState('open')
            }
        }
        if (offset < buf.length) this.buffers.push(buf.slice(offset))
        next()
    }

    _flush (next) {
        if (this.state === 'text') this._pushState('text')
        this.push(null)
        next()
    }
}

// Tokenize.prototype._transform = function (buf, enc, next) {
//     let i = 0
//     let offset = 0

//     if (this._prev) {
//         buf = Buffer.concat([this._prev, buf])
//         i = this._prev.length - 1
//         offset = this._offset
//         this._prev = null
//         this._offset = 0
//     }

//     for (; i < buf.length; i++) {
//         const b = buf[i]
//         this._last.push(b)
//         if (this._last.length > 9) this._last.shift()
//         // detect end of raw character mode (comment, script,..)
//         if (this.raw) {
//             const parts = this._testRaw(buf, offset, i)
//             if (parts) {
//                 this.push(['text', parts[0]])

//                 if (this.raw === strings.endComment
//                 || this.raw === strings.endCdata) {
//                     this.state = 'text'
//                     this.buffers = []
//                     this.push(['close', parts[1]])
//                 } else {
//                     this.state = 'open'
//                     this.buffers = [parts[1]]
//                 }

//                 this.raw = null
//                 offset = i + 1
//             }
//         }
//         // ask for more data if last byte is '<'
//         else if (this.state === 'text' && b === codes.lt
//         && i === buf.length - 1) {
//             this._prev = buf
//             this._offset = offset
//             return next()
//         }
//         // detect a tag opening
//         else if (this.state === 'text' && b === codes.lt
//         && !isWhiteSpace(buf[i + 1])) {
//             if (i > 0 && i - offset > 0) {
//                 this.buffers.push(buf.slice(offset, i))
//             }
//             offset = i
//             this.state = 'open'
//             this.tagState = states.TagNameState
//             this._pushState('text')
//         } else if (
//             this.tagState === states.TagNameState &&
//             isWhiteSpace(b)
//         ) {
//             this.tagState = states.AttributeNameState
//         } else if (
//             this.tagState === states.AttributeNameState &&
//             b === codes.equal
//         ) {
//             this.tagState = states.BeforeAttributeValueState
//         } else if (
//             this.tagState === states.BeforeAttributeValueState &&
//             isWhiteSpace(b)
//         ) {} else if (
//             this.tagState === states.BeforeAttributeValueState
//             && b !== codes.gt
//         ) {
//             this.tagState = states.AttributeValueState
//             if (b === codes.dquote) {
//                 this.quoteState = 'double'
//             } else if (b === codes.squote) {
//                 this.quoteState = 'single'
//             } else {
//                 this.quoteState = null
//             }
//         } else if (
//             this.tagState === states.AttributeValueState &&
//             !this.quoteState &&
//             isWhiteSpace(b)
//         ) {
//             this.tagState = states.AttributeNameState
//         } else if (
//             this.tagState === states.AttributeValueState &&
//             this.quoteState === 'double' &&
//             b === codes.dquote
//         ) {
//             this.quoteState = null
//             this.tagState = states.AttributeNameState
//         } else if (
//             this.tagState === states.AttributeValueState &&
//             this.quoteState === 'single' &&
//             b === codes.squote
//         ) {
//             this.quoteState = null
//             this.tagState = states.AttributeNameState
//         } else if (this.state === 'open' && b === codes.gt && !this.quoteState) {
//             this.buffers.push(buf.slice(offset, i + 1))
//             offset = i + 1
//             this.state = 'text'
//             this.tagState = null
//             if (this._getChar(1) === codes.slash) {
//                 this._pushState('close')
//             } else {
//                 const tag = this._getTag()
//                 if (tag === 'script') this.raw = strings.endScript
//                 if (tag === 'style') this.raw = strings.endStyle
//                 if (tag === 'title') this.raw = strings.endTitle
//                 this._pushState('open')
//             }
//         } else if (this.state === 'open' && compare(this._last, strings.comment)) {
//             this.buffers.push(buf.slice(offset, i + 1))
//             offset = i + 1
//             this.state = 'text'
//             this.raw = strings.endComment
//             this._pushState('open')
//         } else if (this.state === 'open' && compare(this._last, strings.cdata)) {
//             this.buffers.push(buf.slice(offset, i + 1))
//             offset = i + 1
//             this.state = 'text'
//             this.raw = strings.endCdata
//             this._pushState('open')
//         }
//     }
//     if (offset < buf.length) this.buffers.push(buf.slice(offset))
//     next()
// }

// Tokenize.prototype._flush = function (next) {
//     if (this.state === 'text') this._pushState('text')
//     this.push(null)
//     next()
// }

// Tokenize.prototype._pushState = function (ev) {
//     if (this.buffers.length === 0) return
//     const buf = Buffer.concat(this.buffers)
//     this.buffers = []
//     this.push([ev, buf])
// }

// Tokenize.prototype._getChar = function (i) {
//     let offset = 0
//     for (let j = 0; j < this.buffers.length; j++) {
//         const buf = this.buffers[j]
//         if (offset + buf.length > i) {
//             return buf[i - offset]
//         }
//         offset += buf
//     }
// }

// Tokenize.prototype._getTag = function () {
//     let offset = 0
//     let tag = ''
//     for (let j = 0; j < this.buffers.length; j++) {
//         const buf = this.buffers[j]
//         for (let k = 0; k < buf.length; k++) {
//             if (offset === 0 && k === 0) continue
//             const c = String.fromCharCode(buf[k])
//             if (/[^\w-!\[\]]/.test(c)) {
//                 return tag.toLowerCase()
//             } else tag += c
//         }
//         offset += buf.length
//     }
// }

// Tokenize.prototype._testRaw = function (buf, offset, index) {
//     const raw = this.raw; const last = this._last
//     if (!compare(last, raw)) return

//     this.buffers.push(buf.slice(offset, index + 1))
//     var buf = Buffer.concat(this.buffers)
//     const k = buf.length - raw.length
//     return [buf.slice(0, k), buf.slice(k)]
// }

function compare (a, b) {
    if (a.length < b.length) return false
    for (let i = a.length - 1, j = b.length - 1; i >= 0 && j >= 0; i--, j--) {
        if (lower(a[i]) !== lower(b[j])) return false
    }
    return true
}

function lower (n) {
    if (n >= 65 && n <= 90) return n + 32
    return n
}

function isWhiteSpace (b) {
    return b === 0x20 || b === 0x09 || b === 0x0A || b === 0x0C || b === 0x0D
}
