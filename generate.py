#!/usr/bin/env python3
"""
Doodle background pattern generator (Python reference implementation).
Produces a seamless SVG tile with Tabler line-art icons.
Requires Python ≥ 3.8. No external dependencies.

Usage:
  python generate.py [--standalone] [--out path/to/output.svg]

Node.js equivalent (used in this project): node generate.mjs
"""

import sys, math, random, re
from pathlib import Path
from typing import NamedTuple

# ── Parameters (edit here) ──────────────────────────────────────────────────
TILE         = 440
SCALE_MIN    = 0.85
SCALE_MAX    = 3.7
STROKE_W     = 1.0
SEED         = 73
PAD          = 1
MAX_DARTS    = 60000
ICON_COLOR   = "#F02860"
ICON_OPACITY = 0.13
# ────────────────────────────────────────────────────────────────────────────


class Placement(NamedTuple):
    idx: int
    cx: float
    cy: float
    rot: int
    scale: float
    r: float


def toric_dist2(x1: float, y1: float, x2: float, y2: float) -> float:
    dx = abs(x1 - x2)
    dy = abs(y1 - y2)
    if dx > TILE / 2: dx = TILE - dx
    if dy > TILE / 2: dy = TILE - dy
    return dx * dx + dy * dy


def radius(s: float) -> float:
    return s * 12 * 1.18 + PAD


def pick_scale(rng: random.Random) -> float:
    b = rng.random()
    if b < 0.30: return rng.uniform(SCALE_MIN, 1.05)
    if b < 0.66: return rng.uniform(1.1, 1.7)
    if b < 0.88: return rng.uniform(1.8, 2.4)
    if b < 0.96: return rng.uniform(2.5, 3.0)
    return rng.uniform(3.1, SCALE_MAX)


def load_icons(path: Path) -> list[dict]:
    icons = []
    for line in path.read_text(encoding="utf-8").strip().splitlines():
        name, raw = line.split("|", 1)
        icons.append({"name": name.strip(), "paths": raw.strip().split("@@@")})
    return icons


def build_defs(icons: list[dict]) -> str:
    parts = []
    for i, ic in enumerate(icons):
        paths = "".join(
            f'<path d="{d}" vector-effect="non-scaling-stroke"/>'
            for d in ic["paths"]
        )
        parts.append(f'<symbol id="i{i}" viewBox="0 0 24 24">{paths}</symbol>')
    return "<defs>\n" + "\n".join(parts) + "\n</defs>"


def generate_placements(icons: list[dict], rng: random.Random) -> list[Placement]:
    placed: list[Placement] = []
    pool = list(range(len(icons)))
    rng.shuffle(pool)
    pool_pos = 0

    def next_icon() -> int:
        nonlocal pool_pos
        if pool_pos == 0:
            rng.shuffle(pool)
        idx = pool[pool_pos]
        pool_pos = (pool_pos + 1) % len(pool)
        return idx

    for _ in range(MAX_DARTS):
        scale = pick_scale(rng)
        r = radius(scale)
        cx = rng.random() * TILE
        cy = rng.random() * TILE
        if any(toric_dist2(cx, cy, p.cx, p.cy) < (r + p.r) ** 2 for p in placed):
            continue
        rot = rng.randint(0, 359)
        placed.append(Placement(next_icon(), cx, cy, rot, scale, r))

    return placed


def build_uses(placements: list[Placement]) -> str:
    uses = []
    offsets = (-TILE, 0, TILE)
    for p in placements:
        reach = 12 * p.scale * 1.5
        for dx in offsets:
            for dy in offsets:
                wx, wy = p.cx + dx, p.cy + dy
                if wx + reach < 0 or wx - reach > TILE: continue
                if wy + reach < 0 or wy - reach > TILE: continue
                t = (f"translate({wx:.2f},{wy:.2f}) "
                     f"rotate({p.rot}) scale({p.scale:.4f}) translate(-12,-12)")
                uses.append(f'<use href="#i{p.idx}" transform="{t}"/>')
    return "\n".join(uses)


def generate(standalone: bool) -> str:
    icons = load_icons(Path(__file__).parent / "icons_raw.txt")
    rng = random.Random(SEED)
    placements = generate_placements(icons, rng)
    print(f"Placed {len(placements)} icons in tile {TILE}×{TILE}", file=sys.stderr)

    defs = build_defs(icons)
    uses = build_uses(placements)
    stroke_color = ICON_COLOR if standalone else "currentColor"
    bg_rect = f'<rect width="{TILE}" height="{TILE}" fill="#0d1418"/>' if standalone else ""

    return f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{TILE}" height="{TILE}" viewBox="0 0 {TILE} {TILE}">
{defs}
<defs>
  <pattern id="doodle" patternUnits="userSpaceOnUse" width="{TILE}" height="{TILE}">
    {bg_rect}
    <g fill="none" stroke="{stroke_color}" stroke-width="{STROKE_W}" stroke-linecap="round" stroke-linejoin="round" opacity="{ICON_OPACITY}">
      <rect width="{TILE}" height="{TILE}" fill="transparent" stroke="none"/>
{uses}
    </g>
  </pattern>
</defs>
<rect width="{TILE}" height="{TILE}" fill="url(#doodle)"/>
</svg>"""


if __name__ == "__main__":
    standalone = "--standalone" in sys.argv
    out_idx = next((i for i, a in enumerate(sys.argv) if a == "--out"), None)
    out_path = (Path(sys.argv[out_idx + 1]) if out_idx else
                Path(__file__).parent / ("doodle-standalone.svg" if standalone else "doodle-theme.svg"))
    out_path.write_text(generate(standalone), encoding="utf-8")
    print(f"Written → {out_path}")
