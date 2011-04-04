#!/usr/bin/python

import png, sys, math

align = 11

if len(sys.argv) < 3: 
	print("usage: jsfile pngfile")
	sys.exit(0)

f = open(sys.argv[1])
data = f.read()
n = len(data)
align = (1 << align) - 1
w = int(round(math.sqrt(n)) + align) & ~align;
h = int(1 + (n - 1) / w)
print("creating %dx%d image..." %(w, h));

rows = []
for i in xrange(0, h):
	rows.append([])
	for j in xrange(0, w):
		idx = i * w + j
		c = ord(data[idx]) if idx < n else 10
		if c < 32:
			if c == 10:
				c = 31
			else:
				raise Exception("unsupported char code %d" %c)
		rows[i].append(c - 31)

out = open(sys.argv[2], 'wb')

#print pixels
w = png.Writer(width=w, height=h, greyscale = True, bitdepth = 8, compression=9)
w.write(out, rows)
