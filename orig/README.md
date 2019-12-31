This is the source code of the original colorForth, for reference.
There are three parts:
- Assembly language code in `*.ASM` files
- Icons
- colorForth code
The latter two are only distributed as part of the `COLOR.COM` image.
`forth.txt` contains the decompiled colorForth code in text form, using idiosyncratic syntax instead of colours.
`forth.html` is the same, but in Technicolor.

My script `discf.py` decompiles the colorForth code.
It uses a ASCII representation for the colorForth.
`discfcolor.py` decompiles into colors (terminal or HTML).

`asmcf.py` assembles the ASCII form back into binary format.
