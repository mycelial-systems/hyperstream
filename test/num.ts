const test = require('tap').test
const through = require('through')
const hyperstream = require('../')

const fs = require('fs')
const expected = fs.readFileSync(__dirname + '/num/expected.html', 'utf8')

test('num', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '#a': 5,
        '#b': 6,
        '#c': { n: 123 },
        '#c span': function (html) { return html.length }
    })
    const rs = fs.createReadStream(__dirname + '/num/index.html')

    let data = ''
    rs.pipe(hs).pipe(through(write, end))

    function write (buf) { data += buf }

    function end () {
        t.equal(data, expected)
    }
})
