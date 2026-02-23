import { hyperstreamFromString } from '../src/index.js'

const template = `<article class="card">
    <h2 id="title"></h2>
    <p class="body"></p>
    <a id="cta" href="#">docs</a>
</article>`

async function renderExample ():Promise<void> {
    const transformed = await hyperstreamFromString(template, {
        '#title': 'Hello from the browser',
        '.body': {
            _text: 'This content was transformed with hyperstream in a browser build.'
        },
        '#cta': {
            href: 'https://github.com/substrate-system/hyperstream',
            target: '_blank',
            rel: 'noopener noreferrer'
        }
    })

    const input = document.getElementById('input')
    const output = document.getElementById('output')
    const live = document.getElementById('live')

    if (!input || !output || !live) {
        throw new Error('Example DOM nodes are missing.')
    }

    input.textContent = template
    output.textContent = transformed
    live.innerHTML = transformed
}

renderExample().catch(err => {
    console.error(err)
})
