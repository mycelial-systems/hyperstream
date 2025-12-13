import { test } from '@substrate-system/tapzero'
import through from 'through'
import hyperstream from '../src/index.js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const expected = fs.readFileSync(__dirname + '/string/expected.html', 'utf8')

test('glue html streams from disk', function (t) {
    t.plan(1)

    const hs = hyperstream({
        '#a': fs.createReadStream(__dirname + '/string/a.html'),
        '#b': fs.createReadStream(__dirname + '/string/b.html'),
        'head title': 'beep boop',
        '#c span': function (html) { return html.toUpperCase() }
    })
    const rs = fs.createReadStream(__dirname + '/string/index.html')

    let data = ''
    rs.pipe(hs).pipe(through(write, end))

    function write (buf) { data += buf }

    function end () {
        t.equal(data, expected)
    }
})
