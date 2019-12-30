import re

lower = re.compile('^[a-z0-9\-./;:!+@*,?]+$')
upper = re.compile('^[A-Z0-9\-./;:!+@*,?]+$')
capit = re.compile('^[A-Z0-9\-./;:!+@*,?][a-z0-9\-./;:!+@*,?]+$')

def enchuck(s):
	w = 0
	n = 0
	r = []
	#print(s)
	for ch in s.lower():
		c = 1 + 'rtoeanismcylgfwdvpbhxuq0123456789j-k.z/;:!+@*,?'.find(ch)
		assert c > 0
		if c < 8:
			nc = 4
			b = c
		elif c < 16:
			nc = 5
			b = 0x10 | c - 8
		else:
			nc = 7
			b = 0x60 | c - 16
		tz = len(bin(b)) - len(bin(b).rstrip('0'))
#		print(ch, bin(b), nc, tz)
		if n + nc - tz > 28:
			r += [w << 32 - n]
			w = 0
			n = 0
		elif n + nc > 28:
			b >>= n + nc - 28
			nc = 28 - n
		w = w << nc | b
		n += nc
	if n != 0:
		r += [w << 32 - n]
	#print([hex(x) for x in r])
	return r
def do_comment(w):
	r = enchuck(w)
	if lower.match(w):
		r[0] |= 9
	elif upper.match(w):
		r[0] |= 11
	elif capit.match(w):
		r[0] |= 10
	else:
		assert False
	return r
def do_number(w, hex, execute, magenta):
	if magenta:
		return [w]
	if w>>26 in [0,63]:
		return [w<<5 & 0xffffffff | int(hex)<<4 | (8 if execute else 6)]
	else:
		return [int(hex)<<4 | (2 if execute else 5), w]
def do_word(w, execute, cyan, next):
	r = enchuck(w)
	if next == 'red':
		r[0] |= 3
	elif next == 'magenta':
		r[0] |= 12
	elif execute:
		r[0] |= 1
	elif cyan:
		r[0] |= 7
	else:
		r[0] |= 4
	return r

f = open('cf.f', 'r')
blocks = {}
comment = False
execute = False
cyan = False
next = ''
for l in f:
	words = l.split()
	for w in words:
		if w[0] == '#':
			cur = int(w[1:])
			if cur not in blocks.keys():
				blocks[cur] = []
		elif w == '(':
			comment = True
		elif comment:
			if w == ')':
				comment = False
			else:
				blocks[cur] += do_comment(w)
		elif w == '[':
			assert not execute and next == ''
			execute = True
		elif w == ']':
			assert execute and next == ''
			execute = False
		elif w == '[[':
			assert not cyan and next == ''
			cyan = True
		elif w == ']]':
			assert cyan and next == ''
			cyan = False
		elif w == ':':
			assert not execute and not cyan and next == ''
			next = 'red'
		elif w.isdigit():
			assert not cyan and (next == '' or next == 'magenta-num')
			blocks[cur] += do_number(int(w), False, execute, next == 'magenta-num')
			next = ''
		elif w[0:2] == '$$':
			assert next != 'magenta-num'
			blocks[cur] += do_word(w[2:], execute, cyan, next)
			next = ''
		elif w[0] == '$':
			assert not cyan and (next == '' or next == 'magenta-num')
			blocks[cur] += do_number(int(w[1:], 16), True, execute, next == 'magenta-num')
			next = ''
		elif w == 'MagentaV':
			assert not execute and not cyan and next == ''
			next = 'magenta'
		else:
			assert next != 'magenta-num'
			blocks[cur] += do_word(w, execute, cyan, next)
			if next == 'magenta':
				next = 'magenta-num'
			else:
				next = ''

g = open('new.bin', 'wb')
for i in range(63):
	if i not in blocks:
		g.write(bytes([0] * 1024))
		continue
	b = blocks[i]
	for j in b:
		g.write(bytes([j & 0xff, j >> 8 & 0xff, j >> 16 & 0xff, j >> 24 & 0xff]))
	g.write(bytes([0] * (4 * (256 - len(b)))))
