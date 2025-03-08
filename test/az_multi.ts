const test = require('tap').test
const hyperstream = require('../')
const through = require('through')
const concat = require('concat-stream')

const fs = require('fs')
const expected = fs.readFileSync(__dirname + '/az_multi/expected.html', 'utf8')

test('fs stream and a slow stream', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '#a': createAzStream(),
        '#b': fs.createReadStream(__dirname + '/az_multi/b.html'),
        '#c': createAzStream(),
        '#d': fs.createReadStream(__dirname + '/az_multi/d.html')
    })
    hs.pipe(concat(function (src) {
        t.equal(src.toString('utf8'), expected)
    }))

    const rs = fs.createReadStream(__dirname + '/az_multi/index.html')
    rs.pipe(hs)
})

function createAzStream () {
    const rs = through()
    let ix = 0
    var iv = setInterval(function () {
        rs.queue(String.fromCharCode(97 + ix))
        if (++ix === 26) {
            clearInterval(iv)
            rs.queue(null)
        }
    }, 25)
    return rs
}
