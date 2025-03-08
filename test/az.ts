const test = require('tap').test
const hyperstream = require('../')
const Stream = require('stream')

const fs = require('fs')
const expected = fs.readFileSync(__dirname + '/az/expected.html', 'utf8')

test('fs stream and a slow stream', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '#a': createAzStream(),
        '#b': fs.createReadStream(__dirname + '/az/b.html')
    })
    let data = ''
    hs.on('data', function (buf) { data += buf })
    hs.on('end', function () {
        t.equal(data, expected)
    })

    const rs = fs.createReadStream(__dirname + '/az/index.html')
    rs.pipe(hs)
})

function createAzStream () {
    const rs = new Stream()
    rs.readable = true
    let ix = 0
    var iv = setInterval(function () {
        rs.emit('data', String.fromCharCode(97 + ix))
        if (++ix === 26) {
            clearInterval(iv)
            rs.emit('end')
        }
    }, 25)
    return rs
}
