import hyperstream from '../src/index.js'
import { test } from '@substrate-system/tapzero'
import { processHtml } from './helpers.js'
import ent from '../src/ent/index.js'

test('prepend implicit text', async function (t) {
    const hs = hyperstream({
        '.row': { _prepend: '<b>so</b>' }
    })

    const result = await processHtml(hs, '<div class="row"> wow</div>')
    t.equal(result, '<div class="row">' + ent.encode('<b>so</b>') + ' wow</div>')
})

test('prepend text', async function (t) {
    const hs = hyperstream({
        '.row': { _prependText: '<b>so</b>' }
    })

    const result = await processHtml(hs, '<div class="row"> wow</div>')
    t.equal(result, '<div class="row">' + ent.encode('<b>so</b>') + ' wow</div>')
})

test('prepend html', async function (t) {
    const hs = hyperstream({
        '.row': { _prependHtml: '<b>so</b>' }
    })

    const result = await processHtml(hs, '<div class="row"> wow</div>')
    t.equal(result, '<div class="row"><b>so</b> wow</div>')
})

test('prepend implicit text pre-existing markup', async function (t) {
    const hs = hyperstream({
        '.row': { _prepend: '<b>so</b>' }
    })

    const result = await processHtml(hs, '<div class="row"> <i>wow</i></div>')
    t.equal(result, '<div class="row">' + ent.encode('<b>so</b>') + ' <i>wow</i></div>')
})

test('prepend text pre-existing markup', async function (t) {
    const hs = hyperstream({
        '.row': { _prependText: '<b>so</b>' }
    })

    const result = await processHtml(hs, '<div class="row"> <i>wow</i></div>')
    t.equal(result, '<div class="row">' + ent.encode('<b>so</b>') + ' <i>wow</i></div>')
})

test('prepnd html pre-existing markup', async function (t) {
    const hs = hyperstream({
        '.row': { _prependHtml: '<b>so</b>' }
    })

    const result = await processHtml(hs, '<div class="row"> <i>wow</i></div>')
    t.equal(result, '<div class="row"><b>so</b> <i>wow</i></div>')
})
