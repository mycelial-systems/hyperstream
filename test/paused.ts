const test = require('tap').test
const through = require('through')
const hyperstream = require('../')

const fs = require('fs')
const expected = fs.readFileSync(__dirname + '/none/index.html', 'utf8')

test('paused output', function (t) {
    t.plan(1)

    const hs = hyperstream()
    hs.pause()
    setTimeout(function () {
        hs.resume()
    }, 500)

    const rs = fs.createReadStream(__dirname + '/none/index.html')

    let data = ''
    rs.pipe(hs).pipe(through(write, end))

    function write (buf) { data += buf }

    function end () {
        t.equal(data, expected)
    }
})
