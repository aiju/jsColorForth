jsColorForth
=============

This is a port of Chuck Moore's [colorForth](https://colorforth.github.io/cf.htm) to Javascript.
I derived it from the original assembly and Forth code, trying to stay fairly to the original.

Notable changes made:

- Since I can't compile to machine code, I compile to a bytecode ("wordcode") that gets JIT compiled to Javascript (Webassembly would be interesting to try as an alternative)
- Naturally, all the PC hardware specific code is gone.
- Currently the 'VM' is Harvard architecture and the wordcode is compiled to an append-only array.
