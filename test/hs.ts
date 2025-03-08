const test = require('tap').test
const through = require('through')
const hyperstream = require('../')

const fs = require('fs')
const expected = fs.readFileSync(__dirname + '/hs/expected.html', 'utf8')

test('glue html streams from disk', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '#a': fs.createReadStream(__dirname + '/hs/a.html'),
        '#b': fs.createReadStream(__dirname + '/hs/b.html')
    })
    const rs = fs.createReadStream(__dirname + '/hs/index.html')

    let data = ''
    rs.pipe(hs).pipe(through(write, end))

    function write (buf) { data += buf }

    function end () {
        t.equal(data, expected)
    }
})
