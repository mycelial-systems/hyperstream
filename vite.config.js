import { defineConfig } from 'vite'

export default defineConfig({
    define: {
        global: 'globalThis'
    },
    root: 'example_browser',
    publicDir: '_public',
    server: {
        port: 8888,
        host: true,
        open: true
    },
    build: {
        minify: false,
        outDir: '../public',
        emptyOutDir: true,
        sourcemap: 'inline'
    }
})
