import hyperstream from '../src/index.js'
import { test } from '@substrate-system/tapzero'
import { processHtml } from './helpers.js'

test('append property', async function (t) {
    const hs = hyperstream({
        '.row': { class: { append: ' post' } }
    })

    const result = await processHtml(hs, '<div class="row">so </div>')
    t.equal(result, '<div class="row post">so </div>')
})

test('prepend property', async function (t) {
    const hs = hyperstream({
        '.row': { class: { prepend: 'pre ' } }
    })

    const result = await processHtml(hs, '<div class="row">so </div>')
    t.equal(result, '<div class="pre row">so </div>')
})

test('append and prepend property', async function (t) {
    const hs = hyperstream({
        '.row': { class: { prepend: 'pre ', append: ' post' } }
    })

    const result = await processHtml(hs, '<div class="row">so </div>')
    t.equal(result, '<div class="pre row post">so </div>')
})

test('append and prepend empty property', async function (t) {
    const hs = hyperstream({
        div: { class: { prepend: 'pre ', append: ' post' } }
    })

    const result = await processHtml(hs, '<div>so </div>')
    t.equal(result, '<div class="pre  post">so </div>')
})

test('append property with empty string', async function (t) {
    const hs = hyperstream({
        div: { class: { append: '' } }
    })

    const result = await processHtml(hs, '<div class="row">so </div>')
    t.equal(result, '<div class="row">so </div>')
})
