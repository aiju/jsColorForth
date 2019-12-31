#!/usr/bin/python3
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

f = open('COLOR.COM', 'rb')
for i in range(63):
	block = f.read(1024)
	if i < 18: continue
	print('#{}'.format(i))
	words = [block[4*j] | block[4*j+1] << 8 | block[4*j+2] << 16 | block[4*j+3] << 24 for j in range(256)]
	j = 0
	line = 0
	comment = False
	execute = False
	cyan = False
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
				dec = '${:x}'.format(sx(w>>5))
			else:
				dec = str(sx(w>>5))
		elif m == 2 or m == 5:
			if j  == len(words):
				raise ValueError
			else:
				if w & 0x10:
					dec = '${:x}'.format(words[j])
				else:
					dec = str(words[j])
				j += 1
		elif m == 10:
			dec = s.capitalize()
		elif m == 11:
			dec = s.upper()
		else:
			dec = s
		pre = ''
		if not m in [2,5,6,8,9,10,11] and dec.isdigit():
			dec = '$$' + dec
		if m in [9,10,11]:
			if not comment:
				pre += '( '
				comment = True
		else:
			if comment:
				pre += ') '
				comment = False
			if m in [1,2,8]:
				if not execute:
					pre += '[ '
					execute = True
			else:
				if execute:
					pre += '] '
					execute = False
				if m == 7:
					if not cyan:
						pre += '[[ '
						cyan = True
				else:
					if cyan:
						pre += ']] '
						cyan = False
					if m == 12:
						pre += '& '
						assert j < len(words)
						dec += ' ' + str(words[j])
						j += 1
					elif m == 3:
						pre += '\n: '
					elif m in [4,6,5]:
						pass
					else:
						print(m)
						raise ValueError
		dec = pre + dec
		print(dec + ' ', end='')
		line += len(dec) + 1
	if comment:
		print(') ', end='')
		line += 2
	if execute:
		print('] ', end='')
		line += 2
	if line > 0:
		print()
