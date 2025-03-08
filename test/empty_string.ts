const test = require('tap').test
const concat = require('concat-stream')
const http = require('http')
const through = require('through')
const hyperstream = require('../')
const hyperquest = require('hyperquest')

test('queue an empty string to an http response', function (t) {
    t.plan(1)
    t.on('end', function () {
        server.close()
    })

    var server = http.createServer(function (req, res) {
        createStream().pipe(res)
    })
    server.listen(function () {
        const port = server.address().port
        const hq = hyperquest('http://localhost:' + port)
        hq.pipe(concat(function (src) {
            t.equal(String(src), '<div class="a">xyz</div>')
        }))
    })
})

function createStream () {
    const stream = through()
    const hs = hyperstream({ '.a': stream })
    const rs = through().pause()
    rs.pipe(hs)
    rs.queue('<div class="a"></div>')
    rs.queue(null)

    process.nextTick(function () {
        rs.resume()
    })

    setTimeout(function () {
        stream.queue('xy')
    }, 25)
    setTimeout(function () {
        stream.queue('')
    }, 50)
    setTimeout(function () {
        stream.queue('z')
    }, 75)
    setTimeout(function () {
        stream.queue(null)
    }, 100)

    return hs
}
