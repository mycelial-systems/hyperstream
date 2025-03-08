const hyperstream = require('../')
const test = require('tap').test
const concat = require('concat-stream')

test('null value', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': null
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row"></div>'
        )
    }))
    hs.end('<div class="row"></div>')
})
