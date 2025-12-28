import hyperstream from '../src/index.js'
import { test } from '@substrate-system/tapzero'
import { processHtml } from './helpers.js'
import ent from '../src/ent/index.js'

test('append implicit text', async function (t) {
    const hs = hyperstream({
        '.row': { _append: '<b>wow</b>' }
    })

    const result = await processHtml(hs, '<div class="row">so </div>')
    t.equal(result, '<div class="row">so ' + ent.encode('<b>wow</b>') + '</div>', 'implicit text should exist')
})

test('append text', async function (t) {
    const hs = hyperstream({
        '.row': { _appendText: '<b>wow</b>' }
    })

    const result = await processHtml(hs, '<div class="row">so </div>')
    t.equal(result, '<div class="row">so ' + ent.encode('<b>wow</b>') + '</div>')
})

test('append html', async function (t) {
    const hs = hyperstream({
        '.row': { _appendHtml: '<b>wow</b>' }
    })

    const result = await processHtml(hs, '<div class="row">so </div>')
    t.equal(result, '<div class="row">so <b>wow</b></div>')
})

test('append implicit text pre-existing markup', async function (t) {
    const hs = hyperstream({
        '.row': { _append: '<b>wow</b>' }
    })

    const result = await processHtml(hs, '<div class="row"><i>so</i> </div>')
    t.equal(result, '<div class="row"><i>so</i> ' + ent.encode('<b>wow</b>') + '</div>')
})

test('append text pre-existing markup', async function (t) {
    const hs = hyperstream({
        '.row': { _appendText: '<b>wow</b>' }
    })

    const result = await processHtml(hs, '<div class="row"><i>so</i> </div>')
    t.equal(result, '<div class="row"><i>so</i> ' + ent.encode('<b>wow</b>') + '</div>')
})

test('append html pre-existing markup', async function (t) {
    const hs = hyperstream({
        '.row': { _appendHtml: '<b>wow</b>' }
    })

    const result = await processHtml(hs, '<div class="row"><i>so</i> </div>')
    t.equal(result, '<div class="row"><i>so</i> <b>wow</b></div>')
})
