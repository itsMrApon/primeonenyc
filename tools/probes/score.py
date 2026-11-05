#!/usr/bin/env python3
"""Mean pixel mismatch between a reference and a clone screenshot (same size).
   python3 tools/probes/score.py ref.png clone.png [--mask x0,y0,x1,y1 ...] [--grid]
   --mask  exclude rectangles (dev overlay pill, time-based marquees, unrebuilt neighbours)
   --grid  print a 6x9 heat map of where the difference is
"""
import sys
from PIL import Image, ImageChops, ImageDraw
args = sys.argv[1:]; ref, clone = args[0], args[1]
masks = [tuple(map(float, a.split(","))) for i, a in enumerate(args) if i > 0 and args[i - 1] == "--mask"]
a = Image.open(ref).convert("RGB"); b = Image.open(clone).convert("RGB")
m = Image.new("L", a.size, 255); d = ImageDraw.Draw(m)
d.rectangle((560, 830, 880, 900), fill=0)  # Nuxt devtools pill in dev
for r in masks: d.rectangle(r, fill=0)
diff = ImageChops.difference(a, b).convert("L")
h = diff.histogram(mask=m); t = sum(h)
print("mean %.2f%%" % (sum(i * c for i, c in enumerate(h)) / t / 255 * 100))
if "--grid" in args:
    W, H = diff.size
    for y0 in range(0, H, 100):
        row = []
        for x0 in range(0, W, 240):
            hh = diff.crop((x0, y0, x0 + 240, y0 + 100)).histogram(); tt = sum(hh)
            row.append("%5.1f" % (sum(i * c for i, c in enumerate(hh)) / tt / 255 * 100))
        print(str(y0).rjust(4), " ".join(row))
