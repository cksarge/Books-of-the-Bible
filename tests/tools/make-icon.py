# Builds icon.svg so the favicon matches the header logo (see CLAUDE.md, "Favicon").
# Needs: pip install fonttools; a Fraunces 700 subset of "73" saved as fontdl/f73 (download command in CLAUDE.md).
# Usage: python3 tests/tools/make-icon.py icon.svg [path/to/f73-font]
# Build icon.svg to match the header logo: conic sweep of section colours + Fraunces 700 "73" as outlines.
import math, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

font = TTFont(sys.argv[2] if len(sys.argv) > 2 else 'fontdl/f73')
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font['head'].unitsPerEm
size = 16 / 34 * 512                       # logo: 16px text in a 34px tile
k = size / upm
# lay out "73" with advances, y flipped
x = 0; items = []
for ch in '73':
    g = cmap[ord(ch)]; items.append((g, x)); x += gs[g].width
bp = BoundsPen(gs)
for g, ox in items:
    gs[g].draw(TransformPen(bp, (1, 0, 0, 1, ox, 0)))
x0, y0, x1, y1 = bp.bounds
tx = 256 - (x0 + x1) / 2 * k
ty = 256 + (y0 + y1) / 2 * k               # centre the ink box
pen = SVGPathPen(gs)
for g, ox in items:
    gs[g].draw(TransformPen(pen, (k, 0, 0, -k, tx + ox * k, ty)))
text_path = pen.getCommands()

stops = ['#dc7418', '#c2402f', '#22955a', '#7a48c4', '#c79300', '#0e978b', '#2b67cf', '#c63c7d', '#4d5a74', '#dc7418']
def col(t):
    seg = t * (len(stops) - 1); i = min(int(seg), len(stops) - 2); f = seg - i
    a = [int(stops[i][j:j+2], 16) for j in (1, 3, 5)]; b = [int(stops[i+1][j:j+2], 16) for j in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(round(a[m] + (b[m] - a[m]) * f) for m in range(3))
N = 120; R = 420; wedges = []
for i in range(N):
    t0, t1 = i / N, (i + 1) / N
    a0 = math.radians(200 + 360 * t0); a1 = math.radians(200 + 360 * t1)
    p0 = (256 + R * math.sin(a0), 256 - R * math.cos(a0)); p1 = (256 + R * math.sin(a1), 256 - R * math.cos(a1))
    c = col((t0 + t1) / 2)
    # the matching stroke closes the hairline seams between neighbouring wedges
    wedges.append(f'<path d="M256 256L{p0[0]:.1f} {p0[1]:.1f}L{p1[0]:.1f} {p1[1]:.1f}Z" fill="{c}" stroke="{c}" stroke-width="3" stroke-linejoin="round"/>')
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Same mark as the header logo (.logo in css/style.css): the nine section colours swept around from 200deg,
       a soft inset rim, and "73" in Fraunces 700 (converted to outlines so it renders without the web font). -->
  <defs><clipPath id="r"><rect width="512" height="512" rx="150"/></clipPath></defs>
  <g clip-path="url(#r)">{"".join(wedges)}</g>
  <rect x="22.5" y="22.5" width="467" height="467" rx="128" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="45"/>
  <path fill="#fff" d="{text_path}"/>
</svg>
'''
open(sys.argv[1], 'w').write(svg)
print('ok', len(svg))
