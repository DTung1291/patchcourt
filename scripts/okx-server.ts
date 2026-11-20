import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const build = await Bun.build({
  entrypoints: [join(root, 'web/app.ts')],
  target: 'browser',
  minify: false,
  sourcemap: 'inline',
})

if (!build.success || !build.outputs[0]) {
  for (const log of build.logs) console.error(log)
  process.exit(1)
}

const bundle = await build.outputs[0].text()
const html = await Bun.file(join(root, 'web/index.html')).text()
const css = await Bun.file(join(root, 'web/styles.css')).text()

Bun.serve({
  port: 4188,
  hostname: '127.0.0.1',
  routes: {
    '/': new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
    '/app.js': new Response(bundle, { headers: { 'content-type': 'text/javascript; charset=utf-8' } }),
    '/styles.css': new Response(css, { headers: { 'content-type': 'text/css; charset=utf-8' } }),
  },
})

console.log('PatchCourt OKX console: http://127.0.0.1:4188')
