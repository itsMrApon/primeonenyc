#!/usr/bin/env python3
"""Slice a minified bundle around a needle instead of reading it (saves tokens).
   python3 -I tools/probes/bundle.py <bundle.js> "<needle>" [before=300] [after=1500] [max=3]
   Good needles: data-attribute names (data-marquee-scroll-speed), uniform names (uFilter),
   class names (callout-socials-card-w), GSAP words near the effect (elastic.out, stagger).
"""
import sys
p, needle = sys.argv[1], sys.argv[2]
before = int(sys.argv[3]) if len(sys.argv) > 3 else 300
after = int(sys.argv[4]) if len(sys.argv) > 4 else 1500
mx = int(sys.argv[5]) if len(sys.argv) > 5 else 3
s = open(p, encoding="utf-8", errors="replace").read()
i, n = s.find(needle), 0
while i != -1 and n < mx:
    print(f"--- @{i}\n" + s[max(0, i - before):i + after].replace("\n", " ") + "\n")
    i = s.find(needle, i + 1); n += 1
if n == 0: print("not found:", needle)
