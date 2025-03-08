const hyperstream = require('../')
const test = require('tap').test
const concat = require('concat-stream')
const through = require('through2')

test('string _html', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': { _html: '<b>beep boop</b>' }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row"><b>beep boop</b></div>'
        )
    }))
    hs.end('<div class="row"></div>')
})

test('stream _html', function (t) {
    t.plan(1)
    const stream = through()
    stream.push('<b>beep boop</b>')
    stream.push(null)

    const hs = hyperstream({
        '.row': { _html: stream }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row"><b>beep boop</b></div>'
        )
    }))
    hs.end('<div class="row"></div>')
})
