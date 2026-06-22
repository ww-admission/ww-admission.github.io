#!/usr/bin/env node
/**
 * Doodle background pattern generator
 * Produces a seamless SVG tile with Tabler line-art icons (dart throwing, toroidal anti-collision).
 * Usage: node generate.mjs [--standalone] [--out path/to/output.svg]
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Parameters (edit here) ──────────────────────────────────────────────────
const TILE        = 440
const SCALE_MIN   = 0.85
const SCALE_MAX   = 3.7
const STROKE_W    = 1.0
const SEED        = 73
const PAD         = 0
const MAX_DARTS   = 200000
const ICON_COLOR  = '#F02860'
const ICON_OPACITY = 0.13
// ────────────────────────────────────────────────────────────────────────────

// Seeded LCG - reproducible randomness without external deps
function makeLcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Toroidal distance² between two centers in a TILE×TILE space
function toricDist2(x1, y1, x2, y2) {
  let dx = Math.abs(x1 - x2)
  let dy = Math.abs(y1 - y2)
  if (dx > TILE / 2) dx = TILE - dx
  if (dy > TILE / 2) dy = TILE - dy
  return dx * dx + dy * dy
}

// Enclosing-circle radius for an icon scaled by `s`
// (icon viewBox is 0 0 24 24, center at 12,12 → half-diagonal ≈ 12*√2*0.83 ≈ 14.1, capped)
function radius(s) {
  return s * 12 * 0.88 + PAD
}

// Scale distribution - biased toward large sizes
function pickScale(rng) {
  const b = rng()
  if (b < 0.30) return SCALE_MIN + rng() * (1.05 - SCALE_MIN)   // small
  if (b < 0.66) return 1.1  + rng() * (1.7  - 1.1)              // medium
  if (b < 0.88) return 1.8  + rng() * (2.4  - 1.8)              // large
  if (b < 0.96) return 2.5  + rng() * (3.0  - 2.5)              // very large
  return             3.1  + rng() * (SCALE_MAX - 3.1)            // exceptional (rare)
}

// Parse icons_raw.txt  →  [{name, paths:[]}]
function loadIcons() {
  const txt = readFileSync(join(__dir, 'icons_raw.txt'), 'utf8')
  return txt.trim().split('\n').map(line => {
    const [name, raw] = line.split('|')
    return { name: name.trim(), paths: raw.trim().split('@@@') }
  })
}

// Build <defs> block: one <symbol> per icon
function buildDefs(icons) {
  const parts = []
  icons.forEach((ic, i) => {
    const pathEls = ic.paths.map(d =>
      `<path d="${d}" vector-effect="non-scaling-stroke"/>`
    ).join('')
    parts.push(
      `<symbol id="i${i}" viewBox="0 0 24 24">${pathEls}</symbol>`
    )
  })
  return `<defs>\n${parts.join('\n')}\n</defs>`
}

// Dart-throwing placement + seamless wrap
function generatePlacements(icons, rng) {
  const placed = []
  // Shuffle icon indices for fair rotation
  const idxPool = icons.map((_, i) => i)
  let poolPos = 0

  function nextIcon() {
    if (poolPos === 0) {
      // Fisher-Yates shuffle
      for (let i = idxPool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [idxPool[i], idxPool[j]] = [idxPool[j], idxPool[i]]
      }
    }
    const idx = idxPool[poolPos]
    poolPos = (poolPos + 1) % idxPool.length
    return idx
  }

  for (let dart = 0; dart < MAX_DARTS; dart++) {
    const scale = pickScale(rng)
    const r = radius(scale)
    const cx = rng() * TILE
    const cy = rng() * TILE

    // Check toroidal anti-collision
    let ok = true
    for (const p of placed) {
      if (toricDist2(cx, cy, p.cx, p.cy) < (r + p.r) * (r + p.r)) {
        ok = false
        break
      }
    }
    if (!ok) continue

    const rot = Math.floor(rng() * 360)
    const idx = nextIcon()
    placed.push({ idx, cx, cy, rot, scale, r })
  }

  return placed
}

// Emit <use> elements with 9-offset wrapping
function buildUses(placements) {
  const uses = []
  const offsets = [-TILE, 0, TILE]

  for (const p of placements) {
    const maxReach = 12 * p.scale * 1.5  // generous bounding radius

    for (const dx of offsets) {
      for (const dy of offsets) {
        const wx = p.cx + dx
        const wy = p.cy + dy
        // Keep copies that visually touch the tile [0, TILE]
        if (wx + maxReach < 0 || wx - maxReach > TILE) continue
        if (wy + maxReach < 0 || wy - maxReach > TILE) continue

        // transform: translate to center → rotate → scale → move origin to icon center
        const t = `translate(${wx.toFixed(2)},${wy.toFixed(2)}) rotate(${p.rot}) scale(${p.scale.toFixed(4)}) translate(-12,-12)`
        uses.push(`<use href="#i${p.idx}" transform="${t}"/>`)
      }
    }
  }
  return uses.join('\n')
}

function generate(standalone, nobg = false) {
  const icons = loadIcons()
  const rng = makeLcg(SEED)
  const placements = generatePlacements(icons, rng)

  console.log(`Placed ${placements.length} icons in tile ${TILE}×${TILE}`)

  const defs = buildDefs(icons)
  const uses = buildUses(placements)

  // nobg = transparent background (for CSS usage) | standalone = dark bg baked in | default = currentColor
  const strokeColor = (standalone || nobg) ? ICON_COLOR : 'currentColor'
  const bgRect = standalone ? `<rect width="${TILE}" height="${TILE}" fill="#0d1418"/>` : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
${defs}
<defs>
  <pattern id="doodle" patternUnits="userSpaceOnUse" width="${TILE}" height="${TILE}">
    ${bgRect}
    <g fill="none" stroke="${strokeColor}" stroke-width="${STROKE_W}" stroke-linecap="round" stroke-linejoin="round" opacity="${ICON_OPACITY}">
      <rect width="${TILE}" height="${TILE}" fill="transparent" stroke="none"/>
${uses}
    </g>
  </pattern>
</defs>
<rect width="${TILE}" height="${TILE}" fill="url(#doodle)"/>
</svg>`

  return svg
}

// CLI
const args = process.argv.slice(2)
const standalone = args.includes('--standalone')
const nobg      = args.includes('--nobg')
const outIdx = args.indexOf('--out')
const outPath = outIdx !== -1 ? args[outIdx + 1]
  : join(__dir, standalone ? 'doodle-standalone.svg' : nobg ? 'doodle-nobg.svg' : 'doodle-theme.svg')

const svg = generate(standalone, nobg)
writeFileSync(outPath, svg, 'utf8')
console.log(`Written → ${outPath}`)
