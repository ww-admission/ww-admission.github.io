import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(__dir, 'doodle-inline.svg'), 'utf8').trim()

const component = `---
// Re-generate: node generate.mjs  (seed 73, TILE 440, ~111 icons, dart-throwing toroidal)
const svgContent = ${JSON.stringify(svg)}
---

<div
  class="absolute inset-0 pointer-events-none overflow-hidden text-primary-500"
  aria-hidden="true"
  set:html={svgContent}
/>
`

const outPath = join(__dir, 'src/components/DoodleBackground.astro')
writeFileSync(outPath, component, 'utf8')
console.log('Written:', outPath, (component.length / 1024).toFixed(1), 'KB')
