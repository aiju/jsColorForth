"use strict";
/*
	to implement stack manipulation, 'trampolining' is used.
	functions that manipulate the stack are called dollar functions
	and their names prefixed with a dollar sign, like $ACCEPT.  dollar
	functions must not be called directly, but instead are pushed
	on the return stack ret.  the master loop for(;;) ret.pop()()
	will then pick them up and execute them.  it's generally legal to
	push a sequence of functions on the return stack to execute them
	(in reverse of the order pushed).  non-dollar functions are also
	legal to push on the return stack.

	dollar functions can have arguments which are passed using

		ret.push(() => $fn(a,b,c));

	dollar functions can't currently have return values.

	summary:
	function x() {
		OK: y();
		NEIN NEIN NEIN: ret.push(...)
		NEIN NEIN NEIN: ret.pop(...)
		NEIN NEIN NEIN: $z();
	}
	function $x() {
		OK: y();
		OK: ret.push(x);
		OK: ret.push($z);
		OK: ret.pop();
		NEIN NEIN NEIN: $z();
	}
*/

var tos = 0;
var flag = false;
var next = 0;
var screen = undefined;
var main_ret = [];
var main_data = [];
var god_ret = [];
var god_data = [];

var data = god_data;
var ret = god_ret;
var me = 'god';
var mem;

function alit() { lit = adup; literal(); }
function adup() { DUP_(); }
var lit = adup;

var dict = [];
var dict_fn = [];
var dict_name = []; /* for debugging */
var nojit = [];
var here = 0;
var list = [0, 0];
var mk = [0, 0, 0];

var forth0 = [];
var forth2 = [];
var macro0 = [];
var macro2 = [];

function enchuck(s) {
	var w = 0;
	var n = 0;
	var r = [];
	var nc, b;
	for(var i = 0; i < s.length; i++){
		var c = 1 + 'rtoeanismcylgfwdvpbhxuq0123456789j-k.z/;:!+@*,?'.indexOf(s[i]);
		if(c == 0) throw new Error("unchuckable");
		if(c < 8) { nc = 4; b = c; }
		else if(c < 16) { nc = 5; b = 0x10 | c - 8; }
		else { nc = 7; b = 0x30; b = 0x60 | c - 16; }
		if(n + nc - ctz(b) > 28){
			r.push(w << 32 - n);
			w = 0;
			n = 0;
		}else if(n + nc > 28){
			b >>= n + nc - 28;
			nc = 28 - n;
		}
		w = w << nc | b;
		n += nc;
	}
	if(n != 0)
		r.push(w << 32 - n);
	return r;
}

function builtin(name, fn) {
	if(fn.name == '' || fn.name == 'anonymous')
		throw new Error("don't call builtin_macro with anonymous functions");
	var w = enchuck(name)[0];
	forth0.push(w);
	forth2.push(dict.length);
	dict[here++] = 0;
	dict_fn.push(fn);
	dict_name.push(name);
	fn.$ = fn.name[0] == '$';
	nojit.push(true);
}
function builtin_macro(name, fn) {
	if(fn.name == '' || fn.name == 'anonymous')
		throw new Error("don't call builtin_macro with anonymous functions");
	var w = enchuck(name)[0];
	macro0.push(w);
	macro2.push(dict.length);
	dict[here++] = 0;
	dict_fn.push(fn);
	dict_name.push(name);
	fn.$ = fn.name[0] == '$';
	nojit.push(true);
}

var INS_NOP = 0;
var INS_DUP = 1;
var INS_DROP = 2;
var INS_SETTOS = 3;
var INS_FORTH = 4;
var INS_MACRO = 5;
var INS_SEMI = 6;
var INS_JYES = 7;
var INS_JNO = 8;
var INS_NOT = 9;
var INS_PUSH = 0xb;
var INS_POP = 0xc;
var INS_ADD = 0xd;
var INS_UPLUS = 0xe;
var INS_NEXT = 0xf;
var INS_MUL = 0x10;
var INS_BANG = 0x11;
var INS_AT = 0x12;
var INS_LSH = 0x13;
var INS_ASR = 0x14;
var INS_NIP = 0x15;
var INS_OR = 0x16;
var INS_AND = 0x17;
var INS_TEST = 0x18;
var INS_OVER = 0x19;
var INS_0NEXT = 0x1a;
var INS_TBANG = 0x1b;
var INS_TAT = 0x1c;
var INS_MULDIV = 0x1d;
var INS_DIV = 0x1e;
var INS_MOD = 0x1f;
var INS_LESS = 0x20;

function read(n) {
	return mem[n]|0;
}

function write(n, v) {
	mem[n] = v;
}

function memmove(dst, src, n) {
	mem.copyWithin(dst, src, src + n);
}

function DUP_() {
	data.push(tos);
}

function DROP() {
	tos = data.pop() | 0;
}

function $start() {
	ret.push($ACCEPT);
	ret.push($LOAD);
	ret.push(() => {DUP_(); tos = 18;});
	ret.push($show0);
}
builtin("warm", $start);

function $show0() {
	ret.push(function(){});
	ret.push($SHOW);
}

function $SHOW() {
	screen = ret.pop();
	DUP_();
	tos = 0;
	function $loop(){
		ret.push($loop);
		ret.push(() => {tos++;});
		ret.push(screen);
		ret.push($SWITCH);
	}
	ret.push($loop);
	ret.push($ACT);
}
builtin("show", $SHOW);

function $ACT() {
	main_data.length = 0;
	main_data.push(tos);
	main_ret.length = 0;
	main_ret.push(ret.pop());
	DROP();
}
builtin("act", $ACT);

function c_() {
	god_data = [0, 0];
}
builtin("c", c_);

function $PAUSE() {
	DUP_();
	if(me == 'god'){
		me = 'main';
		data = main_data;
		ret = main_ret;
	}else{
		me = 'god';
		data = god_data;
		ret = god_ret;
	}
	DROP();
}
builtin("pause", $PAUSE);

var sleeping = true;
var sleepmagic = new Object;

function $SLEEP(fn) {
	if(me != 'god') throw new Error('$SLEEP from main thread');
	function loop() {
		if(!fn()){
			ret.push(loop);
			sleeping = true;
			throw sleepmagic;
		}
	}
	ret.push(loop);
	ret.push($PAUSE);
}

function wakeup() {
	if(sleeping){
		sleeping = false;
		setTimeout(master, 0);
	}
}

function delay() {
	let expired = false;
	setTimeout(() => {expired = true; wakeup();}, 250);
	DROP();
	ret.push(() => $SLEEP(() => expired));
}
builtin("delay", delay);

function $ABORT() {
	curs = next;
	blk = next >> 8;
	ret.push($ABORT1);
}

function $ABORT1() {
	ret = god_ret;
	spaces[3] = forthd;
	spaces[4] = $qCOMPILE;
	spaces[5] = cNUM;
	spaces[6] = cSHORT;
	tos = 0o57;
	ECHO_();
	ret.push($ACCEPT);
}

function $LOAD() {
	ret.push(next);
	next = tos * 256;
	DROP();
	ret.push($INTER);
}
builtin("load", $LOAD);

function $INTER() {
	var word, f;

	word = read(next);
	next++;
	f = spaces[word & 0o17];
	ret.push($INTER);
	ret.push(() => f(word));
}

function $qIGNORE(word) {
	if(word == 0){
		ret.pop();
		next = ret.pop();
	}
}

function nul() {
}

function $execute(word) {
	var r;

	lit = alit;
	DUP_();
	tos = word & -16;
	r = forth0.lastIndexOf(tos);
	if(r < 0){
		console.log("not found " + dechuck(word & -16));
		ret.push($ABORT);
	}else{
		DROP();
		ret.push(dict_fn[forth2[r]]);
	}
}

function NUM(word) {
	lit = alit;
	DUP_();
	tos = read(next);
	next++;
}

function SHORT_(word) {
	lit = alit;
	DUP_();
	tos = word >> 5;
}

function MACRO(word) {
	spaces[3] = macrod;
}
builtin("macro", MACRO);

function FORTH(word) {
	spaces[3] = forthd;
}
builtin("forth", FORTH);

function macrod(word) {
	macro0.push(word & -16);
	var h = here;
	macro2.push(h);
	dict_fn[h] = () => jit(h)();
	dict_name[h] = dechuck(word & -16);
	list[0] = undefined;
	lit = adup;
}

function forthd(word) {
	forth0.push(word & -16);
	var h = here;
	forth2.push(h);
	dict_fn[h] = () => jit(h)();
	dict_name[h] = dechuck(word & -16);
	list[0] = undefined;
	lit = adup;
}

function $qCOMPILE(word) {
	var r;

	lit();
	tos = word & -16;
	r = macro0.lastIndexOf(tos);
	if(r >= 0){
		DROP();
		ret.push(dict_fn[macro2[r]]);
	}else{
		r = forth0.lastIndexOf(tos);
		if(r < 0){
			console.log("not found " + dechuck(word & -16));
			ret.push($ABORT);
		}else{
			list[0] = here;
			dict[here++] = INS_FORTH;
			dict[here++] = r;
			DROP();
		}
	}
}

function $COMPILE(word) {
	var r;

	lit();
	tos = word & -16;
	r = macro0.lastIndexOf(tos);
	if(r < 0){
		console.log("not found " + dechuck(word & -16));
		ret.push($ABORT);
	}else{
		list[0] = here;
		dict[here++] = INS_MACRO;
		dict[here++] = r;
		DROP();
	}
}

function cNUM(word) {
	lit();
	tos = read(next);
	next++;
	literal();
	DROP();
}

function cSHORT(word) {
	lit();
	tos = word >> 5;
	literal();
	DROP();
}

function variable(word) {
	forth0.push(word & -16);
	forth2.push(dict.length);
	dict_fn[dict.length] = () => {DUP_(); tos = a;};
	dict_fn[dict.length].$ = false;
	dict_name[dict.length] = dechuck(word & -16);
	nojit[dict.length] = true;
	dict.push(0);
	let a = next;
	dict_name[h] = dechuck(word);
	macro0.push(word & -16);
	forth2.push(dict.length);
	dict.push(0);
	dict_fn[dict.length] = () => {lit(); tos = a; literal(); DROP();};
	dict_fn[dict.length].$ = false;
	dict_name[dict.length] = dechuck(word & -16);
	nojit[dict.length] = true;
	dict.push(0);
	list[0] = undefined;
	lit = adup;
	next++;
}

function cdrop() {
	list[0] = here;
	dict[here++] = INS_DROP;
}
builtin_macro("drop", cdrop);

function cdup() {
	dict[here++] = INS_DUP;
}
builtin_macro("dup", cdup);

function qdup() {
	if(list[0] != here-1 || dict[here-1] != INS_DROP)
		cdup();
	else
		here--;
}
builtin_macro("?dup", qdup);

function qlit() {
	if(list[0] != here-2 || dict[here-2] != INS_SETTOS)
		flag = false;
	else{
		flag = true;
		DUP_();
		list[0] = list[1];
		if(dict[here-3] == INS_DUP){
			here -= 3;
		}else{
			here -= 2;
			cdrop();
		}
	}
}
builtin("?lit", qlit);

function literal() {
	qdup();
	list[1] = list[0];
	list[0] = here;
	dict[here++] = INS_SETTOS;
	dict[here++] = tos;
}

function semi() {
	dict[here++] = INS_SEMI;
}
builtin_macro(";", semi);

function then() {
	list[0] = undefined;
	dict[tos-1] = here;
	DROP();
}
builtin_macro("then", then);

function begin() {
	list[0] = undefined;
	DUP_();
	tos = here;
}
builtin_macro("begin", begin);

function comma() {
	dict[here++] = tos;
	DROP();
}
builtin(",", comma);

function HERE() {
	DUP_();
	tos = here;
}
builtin("here", HERE);

function mark() {
	mk = [macro0.length, forth0.length, here];
}
builtin("mark", mark);

function empty() {
	macro2.length = macro0.length = mk[0];
	forth2.length = forth0.length = mk[1];
	here = mk[2];
}
builtin("empt", empty);

function log() {
	console.log(data, tos);
}
builtin("log", log);

function debug() {
	debugger;
}
builtin("debug", debug);

function erase() {
	var n = tos << 8; DROP();
	var a = tos << 8; DROP();
	mem.fill(0, a, a + n);
}
builtin("erase", erase);

function $copy() {
	if(tos < 12) ret.push($ABORT1);
	var a = tos; DROP();
	memmove(a << 8, blk << 8, 256);
	blk = a;
}
builtin("copy", $copy);

function master() {
	try {
		for(var i = 0; i < 1000; i++)
			ret.pop()();
		setTimeout(master, 0);
	}catch(e){
		if(e !== sleepmagic){
			console.log(e.stack);
			throw e;
		}
	}
}

function dict_$(n) {
	var f = dict_fn[n];
	if(f !== undefined && f.$ !== undefined)
		return f.$;
	return jit_instrs[n].$;
}

function common(t) { }
function Basic(id, s, n, $) { this.id = id; this.stat = s; this.next = [n]; common(this); this.is$ = () => !!$; }
function Semi(id) { this.id = id; this.next = []; common(this); }
function JSCall(id, f, n) { this.id = id; this.fun = f; this.next = [n]; if(!nojit[f]) this.next.push(f); common(this); }
function Cond(id, c, t, e) { this.id = id; this.cond = c; this.next = [t,e]; common(this); }
function Next(id, c, t, e) { this.id = id; this.cond = c; this.next = [t,e]; common(this); }

Basic.prototype.mktext = function(n) { return this.stat + "\n" + n[0]; };
Semi.prototype.mktext = function(n) { return ""; };
JSCall.prototype.mktext = function(n) {
	if(dict_$(this.fun) === false){
		return "dict_fn[" + this.fun + "](); /* " + dict_name[this.fun] + " */\n" + n[0];
	}else{
		var s = "";
		if(n[0] != "")
			s += "ret.push(() => {" + n[0] + "});\n"
		s += "ret.push(dict_fn[" + this.fun + "]); /* " + dict_name[this.fun] + " */ "
		return s;
	}
};
Cond.prototype.mktext = function(n) { return "if(" + this.cond + ") {\n" + n[0] + "} else {\n" + n[1] + "}"; };
Next.prototype.mktext = function(n) { return "if(--ret[ret.length - 1] " + this.cond + ") {\n" + n[0] + "} else {\nret.pop();\n" + n[1] + "}"; };

Semi.prototype.is$ = () => false;
JSCall.prototype.is$ = () => false;
Cond.prototype.is$ = () => false;
Next.prototype.is$ = () => true;

var jit_instrs = [];

function jit_instr(h) {
	switch(dict[h]){
	case INS_NOP: return new Basic(h, '', h + 1);
	case INS_SEMI: return new Semi(h, );
	case INS_DUP: return new Basic(h, "data.push(tos);", h + 1);
	case INS_DROP: return new Basic(h, "tos = data.pop() | 0;", h + 1);
	case INS_SETTOS: return new Basic(h, "tos = " + dict[h+1] + ";", h + 2);
	case INS_NOT: return new Basic(h, "tos = ~tos;", h + 1);
	case INS_PUSH: return new Basic(h, "ret.push(tos);", h + 1, true);
	case INS_POP: return new Basic(h, "tos = ret.pop();", h + 1, true);
	case INS_ADD: return new Basic(h, "tos = 0 | tos + data.pop();", h + 1);
	case INS_MUL: return new Basic(h, "tos = 0 | tos * data.pop();", h + 1);
	case INS_UPLUS: return new Basic(h, "data[data.length - 2] += tos;", h + 1);
	case INS_AT: return new Basic(h, "tos = read(tos);", h + 1);
	case INS_BANG: return new Basic(h, "write(tos, data[data.length - 1]);", h + 1);
	case INS_LSH: return new Basic(h, "tos <<= 1;", h + 1);
	case INS_ASR: return new Basic(h, "tos >>>= 1;", h + 1);
	case INS_NIP: return new Basic(h, "data.length--;", h + 1);
	case INS_OR: return new Basic(h, "tos |= data.pop();", h + 1);
	case INS_AND: return new Basic(h, "tos &= data.pop();", h + 1);
	case INS_TEST: return new Basic(h, "flag = (data[data.length - 1] & tos) != 0;}", h + 1);
	case INS_OVER: return new Basic(h, "tos = data[data.length - 2];", h + 1);
	case INS_TBANG: return new Basic(h, "var t" + dict[h+1] + " = tos;", h + 2);
	case INS_TAT: return new Basic(h, "tos = t" + dict[h+1] + ";", h + 2);
	case INS_MULDIV: return new Basic(h, "tos = data[data.length - 2] * data[data.length - 1] / tos | 0;", h + 1);
	case INS_DIV: return new Basic(h, "tos = data.pop() / tos | 0;", h + 1);
	case INS_MOD: return new Basic(h, "tos = data.pop() % tos;", h + 1);
	case INS_LESS: return new Basic(h, "flag = data[data.length - 1] < tos;", h + 1);

	case INS_FORTH: return new JSCall(h, forth2[dict[h+1]], h+2);
	case INS_MACRO: return new JSCall(h, macro2[dict[h+1]], h+2);
	case INS_JYES: return new Cond(h, "flag", dict[h+1], h+2);
	case INS_JNO: return new Cond(h, "!flag", dict[h+1], h+2);
	case INS_NEXT: return new Next(h, "> 0", dict[h+1], h+2);
	case INS_0NEXT: return new Next(h, ">= 0", dict[h+1], h+2);
	default: throw new Error("invalid opcode " + dict[h]);
	}
}

function jit_loop(start) {
	if(start in jit_instrs) return jit_instrs[start];

	var namectr = 0
	var named = {};

	function handle(p) {
		var n = [];
		var $ = false;
		for(var i = 0; i < p.next.length; i++){
			p.next[i] = jit_instrs[p.next[i]];
			if(p.next[i].text === undefined){
				named[p.next[i].id] = '_' + namectr++;
				n.push("ret.push(" + named[p.next[i].id] + ");");
				$ = true;
			}else{
				n.push(p.next[i].text);
				if(p.next[i].$ !== false)
					$ = true;
			}
		}
		let t = p.mktext(n);
		if(named[p.id]){
			p.text = "function " + named[p.id] + "() {\n" + t + "}\nret.push(" + named[p.id] + ");";
			p.$ = true;
		}else{
			p.text = t;
			p.$ = $ || p.is$();
		}
	}

	var qu = [start];
	while(qu.length != 0){
		let h = qu.pop();
		if(h instanceof Function) {h(); continue;}
		if(h in jit_instrs) continue;
		let p = jit_instr(h);
		jit_instrs[h] = p;
		qu.push(() => handle(p));
		p.next.forEach(x => {
			if(!(x in jit_instrs))
				qu.push(x);
		});
	}
	return jit_instrs[start];
}

function jit(h) {
	var p = jit_loop(h);
	var f = new Function(p.text);
	f.$ = p.$;
	return dict_fn[h] = f;
}

var spaces = [
	$qIGNORE,
	$execute,
	NUM,
	macrod,
	$qCOMPILE,
	cNUM,
	cSHORT,
	$COMPILE,
	SHORT_,
	nul,
	nul,
	nul,
	variable,
	nul,
	nul,
	nul
];

function init() {
	mem = assemble(forth);
	for(var i = 0; i < iconstr.length / 4; i++)
		mem[12*256 + i] =
			iconstr.charCodeAt(4 * i) |
			iconstr.charCodeAt(4 * i + 1) << 8 |
			iconstr.charCodeAt(4 * i + 2) << 16 |
			iconstr.charCodeAt(4 * i + 3) << 24;
	ret.push($start);
	setTimeout(master, 0);
	gfxinit();
}

window.onload = init;
