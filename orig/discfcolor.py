#!/usr/bin/python3
import sys

def dechuck(w):
	s = ""
	while True:
		if w >> 31 == 0:
			c = w >> 28
			w = w << 4 & 0xffffffff
			if c == 0:
				return s
			s += " rtoeani"[c]
		elif w >> 30 == 2:
			c = w >> 27 & 7
			w = w << 5 & 0xffffffff
			s += "smcylgfw"[c]
		else:
			c = w >> 25 & 31
			w = w << 7 & 0xffffffff
			s += "dvpbhxuq0123456789j-k.z/;:!+@*,?"[c]
def sx(n):
	return (n & (1<<26) - 1) - (n & 1<<26) & 0xffffffff

def error(x,h):
	raise ValueError
def t_green(x,h):
	return '\u001b[32{}m{}\u001b[0m'.format('' if h else ';1', x)
def t_red(x,h):
	return '\u001b[31;1m{}\u001b[0m'.format(x)
def t_cyan(x,h):
	return '\u001b[36;1m{}\u001b[0m'.format(x)
def t_yellow(x,h):
	return '\u001b[33{}m{}\u001b[0m'.format('' if h else ';1', x)
def t_white(x,h):
	return '\u001b[37;1m{}\u001b[0m'.format(x)
def t_magenta(x,h):
	return '\u001b[35;1m{}\u001b[0m'.format(x)

t_coltab = [error, t_yellow, t_green, t_red, t_green, t_green, t_green, t_cyan, t_yellow, t_white, t_white, t_white, t_magenta, error, error, error]

def hc(x,c):
	return '<span class="{}">{}</span>'.format(c,x)
def h_yellow(x,h):
	return hc(x, 'darkyellow' if h else 'yellow')
def h_green(x,h):
	return hc(x, 'darkgreen' if h else 'green')
def h_red(x,h):
	return hc(x, 'red')
def h_cyan(x,h):
	return hc(x, 'cyan')
def h_white(x,h):
	return hc(x, 'white')
def h_magenta(x,h):
	return hc(x, 'magenta')

h_coltab = [error, h_yellow, h_green, h_red, h_green, h_green, h_green, h_cyan, h_yellow, h_white, h_white, h_white, h_magenta, error, error, error]

html = len(sys.argv) > 1
coltab = h_coltab if html else t_coltab

if html:
	header = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>title</title>
<style>
body { background-color: black; }
* { color: white; font-family: Courier, monospace; }
th { font-weight: normal; width: 5em; } 
td { padding-bottom: 1em; }
.red { color: #ff0000; }
.green { color: #00f800; }
.darkgreen { color: #00c000; }
.yellow { color: #ffff00; }
.darkyellow { color: #c0c000; }
.cyan { color: #00ffff; }
.magenta { color: #ff00ff; }
th, td { vertical-align: top; }
</style>
</head>
<body>
<table>
"""
	trailer = '</table></body></html>'
	nl = '<br>'
	def paropen(i):
		print('<tr><th>{}</th><td>'.format(i),end='')
	def parclose():
		print('</td></tr>')
else:
	header = ""
	trailer = ""
	nl = '\n'
	def paropen(i):
		print('#{}'.format(i))
	def parclose():
		pass

f = open('COLOR.COM', 'rb')
print(header, end='')
for i in range(63):
	block = f.read(1024)
	if i < 18: continue
	words = [block[4*j] | block[4*j+1] << 8 | block[4*j+2] << 16 | block[4*j+3] << 24 for j in range(256)]
	if words[0] == 0: continue
	paropen(i)
	j = 0
	line = 0
	while j < len(words):
		w = words[j]
		j += 1
		if w == 0:
			break
		m = w & 15
		s = dechuck(w & -16)
		if m in [1,3,4,7,9,10,11]:
			while j < len(words) and words[j] != 0 and (words[j] & 15) == 0:
				s += dechuck(words[j] & -16)
				j += 1
		if m == 8 or m == 6:
			if w & 0x10:
				dec = '{:x}'.format(sx(w>>5))
			else:
				dec = str(sx(w>>5))
		elif m == 2 or m == 5:
			if j  == len(words):
				raise ValueError
			else:
				if w & 0x10:
					dec = '{:x}'.format(words[j])
				else:
					dec = str(words[j])
				j += 1
		elif m == 10:
			dec = s.capitalize()
		elif m == 11:
			dec = s.upper()
		else:
			dec = s
		if m == 3 and line > 0:
			print(nl,end='')
			line = 0
		dec = coltab[m](dec, (w & 0x10) != 0)
		print(dec + ' ', end='')
		line += len(dec) + 1
		if m == 12:
			dec = coltab[2](words[j], False)
			j += 1
			print(dec + ' ', end='')
			line += len(dec) + 1
	if line > 0:
		print(nl,end='')
	parclose()
print(trailer, end='')
