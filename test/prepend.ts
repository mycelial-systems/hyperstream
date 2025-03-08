const hyperstream = require('../')
const test = require('tap').test
const concat = require('concat-stream')
const through = require('through2')
const ent = require('ent')

test('prepend implicit text', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': { _prepend: '<b>so</b>' }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row">' + ent.encode('<b>so</b>') + ' wow</div>'
        )
    }))
    hs.end('<div class="row"> wow</div>')
})

test('prepend text', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': { _prependText: '<b>so</b>' }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row">' + ent.encode('<b>so</b>') + ' wow</div>'
        )
    }))
    hs.end('<div class="row"> wow</div>')
})

test('prepend html', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': { _prependHtml: '<b>so</b>' }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row"><b>so</b> wow</div>'
        )
    }))
    hs.end('<div class="row"> wow</div>')
})

test('prepend implicit text pre-existing markup', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': { _prepend: '<b>so</b>' }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row">' + ent.encode('<b>so</b>') + ' <i>wow</i></div>'
        )
    }))
    hs.end('<div class="row"> <i>wow</i></div>')
})

test('prepend text pre-existing markup', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': { _prependText: '<b>so</b>' }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row">' + ent.encode('<b>so</b>') + ' <i>wow</i></div>'
        )
    }))
    hs.end('<div class="row"> <i>wow</i></div>')
})

test('prepnd html pre-existing markup', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '.row': { _prependHtml: '<b>so</b>' }
    })
    hs.pipe(concat(function (body) {
        t.equal(
            body.toString('utf8'),
            '<div class="row"><b>so</b> <i>wow</i></div>'
        )
    }))
    hs.end('<div class="row"> <i>wow</i></div>')
})
