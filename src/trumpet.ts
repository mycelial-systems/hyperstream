import { wrap as wrapElem } from './wrap.js'
import { Tokenize } from './tokenize.js'
import { Duplex } from 'node:stream'

// const through = require('through2')
// const duplexer = require('duplexer2')
// const tokenize = require('html-tokenize')
// const select = require('html-select')

/**
 * Parse and transform streaming html using css selectors.
 */
export class Trumpet extends Duplex {
    private _tokenize
    _writing = false
    _piping = false
    _select

    constructor () {
        super()
        this._tokenize = new Tokenize()
        this._select = this._tokenize.pipe(select())
    }
}

function oldTrumpet () {
    const self = this
    if (!(this instanceof Trumpet)) return new Trumpet()
    Duplex.call(this)
    this._tokenize = tokenize()
    this._writing = false
    this._piping = false
    this._select = this._tokenize.pipe(select())
    this._select.once('end', function () {
        self.emit('_end')
        self.push(null)
    })
    this.once('finish', function () { self._tokenize.end() })
}

oldTrumpet.prototype.pipe = function () {
    this._piping = true
    return Duplex.prototype.pipe.apply(this, arguments)
}

oldTrumpet.prototype._read = function (n) {
    let row
    const self = this
    let buf; let read = 0
    const s = this._select
    while ((row = s.read()) !== null) {
        if (row[0] === 'END') {
            this.push(row[1][1])
            read++
        } else if (row[1] && row[1].length) {
            this.push(row[1])
            read++
        }
    }
    if (read === 0) s.once('readable', function () { self._read(n) })
}

oldTrumpet.prototype._write = function (buf, enc, next) {
    if (!this._writing && !this._piping) {
        this._piping = true
        this.resume()
    }
    return this._tokenize._write(buf, enc, next)
}

oldTrumpet.prototype.select = function (str, cb) {
    const self = this
    let first = true

    var res = self._selectAll(str, function (elem) {
        if (!first) return
        first = false
        res.createReadStream = function () {}
        res.createWriteStream = function () {}
        res.createStream = function () {}
        if (cb) cb(elem)
    })
    return res
}

oldTrumpet.prototype.selectAll = function (str, cb) {
    return this._selectAll(str, cb)
}

oldTrumpet.prototype._selectAll = function (str, cb) {
    const self = this
    const readers = []; const writers = []; const duplex = []
    const gets = []; const getss = []; const sets = []; const removes = []

    this.once('_end', function () {
        readers.splice(0).forEach(function (r) {
            r.end()
            r.resume()
        })

        duplex.splice(0).forEach(function (d) {
            d.input.end()
            d.input.resume()
        })
    })

    let element, welem
    this._select.select(str, function (elem) {
        element = elem
        welem = wrapElem(elem)
        if (cb) cb(welem)

        elem.once('close', function () {
            element = null
            welem = null
        })

        readers.splice(0).forEach(function (r) {
            welem.createReadStream(r._options).pipe(r)
        })

        writers.splice(0).forEach(function (w) {
            w.pipe(welem.createWriteStream(w._options))
        })

        duplex.splice(0).forEach(function (d) {
            d.input.pipe(welem.createStream(d.options))
                .pipe(d.output)
        })

        gets.splice(0).forEach(function (g) {
            welem.getAttribute(g[0], g[1])
        })

        getss.splice(0).forEach(function (cb) {
            welem.getAttributes(cb)
        })

        sets.splice(0).forEach(function (g) {
            welem.setAttribute(g[0], g[1])
        })

        removes.splice(0).forEach(function (key) {
            welem.removeAttribute(key)
        })
    })

    return {
        getAttribute: function (key, cb) {
            if (welem) return welem.getAttribute(key, cb)
            gets.push([key, cb])
            return this
        },
        getAttributes: function (cb) {
            getss.push(cb)
            return this
        },
        setAttribute: function (key, value) {
            if (welem) return welem.setAttribute(key, value)
            sets.push([key, value])
            return this
        },
        removeAttribute: function (key) {
            if (welem) return welem.removeAttribute(key)
            removes.push(key)
            return this
        },
        createReadStream: function (opts) {
            if (welem) return welem.createReadStream(opts)
            const r = through()
            r._options = opts
            readers.push(r)
            return r
        },
        createWriteStream: function (opts) {
            if (welem) return welem.createWriteStream(opts)
            const w = through()
            w._options = opts
            writers.push(w)
            return w
        },
        createStream: function (opts) {
            if (welem) return welem.createStream(opts)
            const d = { input: through(), output: through() }
            d.options = opts
            duplex.push(d)
            return duplexer(d.input, d.output)
        }
    }
}

oldTrumpet.prototype.createReadStream = function (sel, opts) {
    return this.select(sel).createReadStream(opts)
}

oldTrumpet.prototype.createWriteStream = function (sel, opts) {
    return this.select(sel).createWriteStream(opts)
}

oldTrumpet.prototype.createStream = function (sel, opts) {
    return this.select(sel).createStream(opts)
}
