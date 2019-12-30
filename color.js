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

function TODO(x) { console.log("TODO: " + x); throw "TODO: " + x; }
function E_TODO(x) { return () => TODO(x); }

var dict = [];
var here = 0;
var list = [0, 0];
var mk = [0, 0, 0];

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

function $ACT() {
	main_data.length = 0;
	main_data.push(tos);
	main_ret.length = 0;
	main_ret.push(ret.pop());
	DROP();
}

function c_() {
	god_data = [0, 0];
}

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

var sleeping = true;
var sleepmagic = new Object;

function $SLEEP(fn) {
	if(me != 'god') throw '$SLEEP from main thread';
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
	r = FIND();
	if(r < 0){
		console.log("not found " + dechuck(word & -16));
		ret.push($ABORT);
	}else{
		DROP();
		ret.push(forth2[r]);
	}
}

function FIND() {
	return forth0.lastIndexOf(tos);
}

function mFIND() {
	return macro0.lastIndexOf(tos);
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

function FORTH(word) {
	spaces[3] = forthd;
}

function macrod(word) {
	macro0.push(word & -16);
	var h = here;
	var r = macro2.length;
	macro2.push(() => (macro2[r] = jit(h))());
	list[0] = undefined;
	lit = adup;
}

function forthd(word) {
	forth0.push(word & -16);
	var h = here;
	var r = forth2.length;
	forth2.push(() => (forth2[r] = jit(h))());
	list[0] = undefined;
	lit = adup;
}

function $qCOMPILE(word) {
	var r;

	lit();
	tos = word & -16;
	r = mFIND();
	if(r >= 0){
		DROP();
		ret.push(macro2[r]);
	}else{
		r = FIND();
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
	r = mFIND();
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
	let a = next;
	forth2.push(() => {DUP_(); tos = a;});
	macro0.push(word & -16);
	macro2.push(() => {lit(); tos = a; literal(); DROP();});
	list[0] = undefined;
	lit = adup;
	next++;
}

function cdrop() {
	list[0] = here;
	dict[here++] = INS_DROP;
}

function cdup() {
	dict[here++] = INS_DUP;
}

function qdup() {
	if(list[0] != here-1 || dict[here-1] != INS_DROP)
		cdup();
	else
		here--;
}

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

function then() {
	list[0] = undefined;
	dict[tos-1] = here;
	DROP();
}

function begin() {
	list[0] = undefined;
	DUP_();
	tos = here;
}

function comma() {
	dict[here++] = tos;
	DROP();
}

function HERE() {
	DUP_();
	tos = here;
}

function mark() {
	mk = [macro0.length, forth0.length, here];
}

function empty() {
	macro2.length = macro0.length = mk[0];
	forth2.length = forth0.length = mk[1];
	here = mk[2];
}

function $ACCEPT() {
	shift = alpha0;
	board = alpha;
	ret.push($ACCEPT1);
}

function $ACCEPT1() {
	ret.push(() => {
		if(tos >= 4){
			shift = shift[8];
			ret.push($ACCEPT);
			ret.push(aword);
			ret.push($WORD_);
		}else
			ret.push(shift[tos]);
	});
	ret.push($KEY);
}

function $nul0() {
	DROP();
	ret.push($ACCEPT1);
}

function $WORD_() {
	RIGHT();
	words = 1;
	chars = 1;
	DUP_();
	data[data.length - 1] = 0;
	bits = 28;
	ret.push($WORD1);
}

function $WORD0() {
	DROP();
	ret.push($WORD1);
	ret.push($KEY);
}

function $WORD1() {
	if(!LETTER())
		ret.push(shift[tos]);
	else{
		if(tos != 0){
			DUP_();
			ECHO_();
			PACK();
			chars++;
		}
		DROP();
		ret.push($WORD1);
		ret.push($KEY);
	}
}

function ECHO_() {
	history_.copyWithin(0, 1);
	history_[10] = tos;
	DROP();
}

function PACK() {
	var cl, ch, t;

	if(tos >= 0o20){
		tos += 0o120;
		cl = 7;
	}else{
		cl = 4;
		if((tos & 0o10) != 0){
			cl++;
			tos ^= 0o30;
		}
	}
	t = tos;
	ch = cl;
	while(bits < cl){
		if((tos & 1) != 0){
			tos >>= 1;
			data[data.length - 1] <<= bits + 4;
			words++;
			bits = 28 - ch;
			tos = t;
			DUP_();
			return;
		}else{
			tos >>= 1;
			cl--;
		}
	}
	data[data.length - 1] <<= cl;
	data[data.length - 1] ^= tos;
	bits -= cl;
}

function LJ() {
	data[data.length - 1] <<= bits + 4;
	DROP();
}

function $X() {
	RIGHT();
	tos = words;
	data.length -= words;
	DROP();
	ret.push($ACCEPT);
}

function RIGHT() {
	history_.fill(0);
}

function LETTER() {
	if(tos >= 4){
		tos = board[tos - 4];
		return true;
	}else
		return false;
}

function $ALPHn() { DROP(); ret.push($ALPH0); }
function $ALPH0() {
	shift = alpha0;
	board = alpha;
	DROP();
	ret.push($ACCEPT1);
}

function $STAR0() {
	shift = graph0;
	board = graphics;
	DROP();
	ret.push($ACCEPT1);
}

function $ALPH() {
	shift = alpha1;
	board = alpha;
	ret.push($WORD0);
}

function $GRAPH() {
	shift = graph1;
	board = graphics;
	ret.push($WORD0);
}

function decimal() {
	base = 10;
	shift = numb0;
	board = numbers;
}

function hex() {
	base = 16;
	shift = numb0;
	board = octals;
}

function $OCTAL() {
	if(current == decimal)
		current = hex;
	else
		current = decimal;
	numb0[6] ^= 0o41 ^ 0o16;
	current();
	ret.push($NUMBER0);
}

function $Xn() {
	DROP();
	DROP();
	ret.push($ACCEPT);
}

function $MINUS() {
	sign = tos;
	ret.push($NUMBER2);
}

var digit = [
	14, 10, 0, 0,
	0, 0, 12, 0, 0, 0, 15, 0,
	13, 0, 0, 11, 0, 0, 0, 0,
	0, 1, 2, 3, 4, 5, 6, 7,
	8, 9
];
var sign = 0;

function $NUMBER0() { DROP(); ret.push($NUMBER3); }
function $NUMBER() { current(); sign = 0; tos = 0; ret.push($NUMBER3); }
function $NUMBER3() {
	ret.push(() => {
		if(!LETTER())
			ret.push(shift[tos]);
		else if(tos == 0)
			ret.push($NUMBER0);
		else{
			tos = digit[tos-4];
			if((sign & 0o37) != 0)
				tos = -tos;
			data[data.length - 1] = data[data.length - 1] * base + tos;
			ret.push($NUMBER2);
		}
	});
	ret.push($KEY);
}
function $NUMBER2() {
	DROP();
	shift = numb1;
	ret.push($NUMBER3);
}

function $ENDN() {
	DROP();
	ret.push($ACCEPT);
	ret.push(anumber);
}

function $EX1() {
	var r;

	while(--words > 0)
		DROP();
	r = FIND();
	if(r < 0)
		ret.push($ABORT1);
	else{
		DROP();
		ret.push(forth2[r]);
	}
}

var graph1 = [$WORD0, $X, LJ, $ALPH, 0o25, 0o45, 5, 0];
var graph0 = [$nul0, $nul0, $nul0, $ALPH0, 0, 0, 5, 0, graph1];
var alpha1 = [$WORD0, $X, LJ, $GRAPH, 0o25, 0o45, 0o55, 0];
var alpha0 = [$nul0, $nul0, $NUMBER, $STAR0, 0, 0o41, 0o55, 0, alpha1];
var numb1 = [$NUMBER0, $Xn, $ENDN, $NUMBER0, 0o25, 0o45, 0, 0];
var numb0 = [$nul0, $MINUS, $ALPHn, $OCTAL, 0o43, 5, 0o16, 0, numb1];
var alpha = [
	0o15, 0o12, 0o01, 0o14,
	0o24, 0o02, 0o06, 0o10,
	0o23, 0o11, 0o17, 0o21,
	0o22, 0o13, 0o16, 0o07,
	0o05, 0o03, 0o04, 0o26,
	0o27, 0o44, 0o25, 0o20
];
var graphics = [
	0o31, 0o32, 0o33,  0,
	0o34, 0o35, 0o36, 0o30,
	0o37, 0o40, 0o41, 0o57,
	0o51, 0o50, 0o52, 0o54, //g : ; ! @
	0o46, 0o42, 0o45, 0o56, //g Z J . ,
	0o55, 0o47, 0o53, 0o43 //g * / + -
];
var numbers = [
	0o31, 0o32, 0o33,  0,
	0o34, 0o35, 0o36, 0o30,
	0o37, 0o40, 0o41,  0,
	0,   0 ,  0 ,  0,
	0,   0 ,  0 ,  0,
	0,   0 ,  0 ,  0
];
var octals = [
	0o31, 0o32, 0o33,  0,
	0o34, 0o35, 0o36, 0o30,
	0o37, 0o40, 0o41,  0,
	0 ,  5 , 0o23, 0o12,
	0 , 0o20,  4 , 0o16,
	0 ,  0 ,  0 ,  0
];
var board = alpha;
var shift = alpha0;
var base = 10;
var current = decimal;
var chars = 1;
var aword = $EX1;
var anumber = nul;
var words = 1;
var bits = 28;
var history_ = new Array(11).fill(0);

var yellow = 0xffff00;
function WHITE() { DUP_(); tos = 0xffffff; color(); }
function CYAN() { DUP_(); tos = 0xffff; color(); }
function MAGENTA() { DUP_(); tos = 0xff00ff; color(); }
function SILVER() { DUP_(); tos = 0xc0c0c0; color(); }
function BLUE() { DUP_(); tos = 0x4040ff; color(); }
function RED() { DUP_(); tos = 0xff0000; color(); }
function GREEN() { DUP_(); tos = 0x8000ff00; color(); }
var keyc = yellow;

var keys = {
	KeyQ: 16,
	KeyW: 17,
	KeyE: 18,
	KeyR: 19,
	KeyT: 0,
	KeyY: 0,
	KeyU: 4,
	KeyI: 5,
	KeyO: 6,
	KeyP: 7,
	BracketLeft: 0,
	BracketRight: 0,
	Enter: 0,
	ControlLeft: 0,
	KeyA: 20,
	KeyS: 21,
	KeyD: 22,
	KeyF: 23,
	KeyG: 0,
	KeyH: 0,
	KeyJ: 8,
	KeyK: 9,
	KeyL: 10,
	Semicolon: 11,
	Quote: 0,
	Backquote: 0,
//	ShiftLeft: 0,
	KeyZ: 24,
	KeyX: 25,
	KeyC: 26,
	KeyV: 27,
	KeyN: 1,
	KeyM: 12,
	Comma: 13,
	Period: 14,
	Slash: 15,
//	ShiftRight: 0,
	AltLeft: 3,
	AltRight: 3,
	ShiftLeft: 3,
	ShiftRight: 3,
	Space: 2
};
var keyqueue = [];

function keypressed(e) {
	keyqueue.push(e.code);
	wakeup();
}

function $KEY() {
	DUP_();
	tos = 0;
	function loop() {
		let k = keyqueue.shift();
		if(!(k in keys)){
			ret.push(loop);
			ret.push(() => $SLEEP(() => keyqueue.length != 0));
		}else{
			tos = keys[k];
		}
	}
	ret.push(loop);
	ret.push($PAUSE);
}

var hp = 1024;
var vp = 768;
var canvas, ctx, imageData;
var frame;
var fore = 0;
var xc = 0;
var yc = 0;
var xy = [3, 3];

function color() {
	fore = tos >> 16 & 0xff | tos & 0xff00 | (tos & 0xff) << 16 | 0xff << 24;
	DROP();
}

function gfxinit() {
	canvas = document.getElementById('canvas');
	canvas.addEventListener('keydown', keypressed);
	ctx = canvas.getContext('2d');
	imageData = ctx.createImageData(hp, vp);
	frame = new Uint32Array(imageData.data.buffer);
}

function $SWITCH() {
	ctx.putImageData(imageData, 0, 0);
	ret.push($PAUSE);
}

function AT() {
	xy[0] = tos & 0xffff;
	DROP();
	xy[1] = tos & 0xffff;
	DROP();
}

function pAT() {
	xy[0] = xy[0] + tos & 0xffff;
	DROP();
	xy[1] = xy[1] + tos & 0xffff;
	DROP();
}

function xy_() {
	DUP_();
	tos = xy[0] & 0xffff | xy[1] << 16;
}

function clip() {
	yc = xy[0];
	if((yc & 0x8000) != 0) yc = 0;
	yc &= 0xffff;
	xc = xy[1];
	if((xc & 0x8000) != 0) xc = 0;
	xc &= 0xffff;
	return hp * yc + xc;
}

function box() {
	var d, x, y;

	d = clip();
	y = tos;
	DROP();
	x = tos;
	DROP();
	if(y > vp) y = vp;
	y -= yc;
	if(y < 0) return;
	if(x > hp) x = hp;
	x -= xc;
	if(x < 0) return;
	for(; y > 0; y--){
		frame.fill(fore, d, d + x)
		d += hp;
	}
}

function line() {
	var d, n;

	d = clip();
	n = tos;
	DROP();
	d -= tos;
	DROP();
	frame.fill(fore, d, d + n);
	xy[0]++;
}

var iw = 16 + 6;
var ih = 24 + 6;
var hc = hp / iw | 0;
var vc = vp / ih | 0;
var lm = 3;
var rm = hc * iw;
var xycr = 0;

function emit() {
	var w;
	qcr();
	tos = 12*256 + 16*24/(8*4)*tos;
	var d = clip();
	for(var y = 24; --y >= 0; ){
		if((y & 1) != 0){
			w = read(tos++);
			w = w << 16 | w >>> 16;
			w = w << 8 & 0xff00ff00 | w >> 8 & 0x00ff00ff;
		}
		for(var x = 16; --x >= 0; ){
			if(w >> 31)
				frame[d] = fore;
			d++;
			w <<= 1;
		}
		d += hp - 16;
	}
	DROP();
	xy[1] += iw;
}

function emit2() {
	var w;
	tos = 12*256 + 16*24/(8*4)*tos;
	var d = clip();
	for(var y = 24; --y >= 0; ){
		if((y & 1) != 0){
			w = read(tos++);
			w = w << 16 | w >>> 16;
			w = w << 8 & 0xff00ff00 | w >> 8 & 0x00ff00ff;
		}
		for(var x = 16; --x >= 0; ){
			if(w >> 31){
				frame[d] = fore;
				frame[d+1] = fore;
				frame[d+hp] = fore;
				frame[d+hp+1] = fore;
			}
			d += 2;
			w <<= 1;
		}
		d += 2*(hp - 16);
	}
	DROP();
	xy[1] += iw*2;
}

function text1() {
	WHITE();
	lm = 3;
	rm = hc * iw;
	xy = [3, lm];
	xycr = [3, lm];
}

function qcr() {
	if(xy[1] >= rm) cr();
}
function cr() {
	xy[0] += ih;
	xy[1] = lm;
}
function space() {
	xy[1] += iw;
}

function qdot() { if(base != 10) dot(); else dot10(); }
var tens = [ 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000 ];
function dot10() {
	var d, i;

	d = tos;
	if(d < 0){
		d = -d;
		DUP_();
		tos = 0o43;
		emit();
	}
	for(i = 8; i >= 0; i--){
		tos = d / tens[i] | 0;
		d %= tens[i];
		if(tos != 0)
			break;
	}
	if(i >= 0){
		eDIG1();
		while(--i >= 0){
			tos = d / tens[i] | 0;
			d %= tens[i];
			eDIG1();
		}
	}
	tos = d;
	eDIG1();
	space();
	DROP();
}

var hicon = [
	0o30, 0o31, 0o32, 0o33, 0o34, 0o35, 0o36, 0o37,
	0o40, 0o41, 0o05, 0o23, 0o12, 0o20, 0o04, 0o16
];
	
function eDIG1() { DUP_(); eDIG(); }
function eDIG() {
	tos = hicon[tos];
	emit();
}
function oDIG() {
	tos = tos << 4 | tos >>> 28;
	DUP_();
	tos &= 0xf;
	return tos;
}
function dot() {
	var i;

	for(i = 7; i > 0; i--){
		if(oDIG())
			break;
		DROP();
	}
	if(i <= 0)
		oDIG();
	i++;
	for(;;){
		eDIG();
		if(--i <= 0) break;
		oDIG();
	}
	space();
	DROP();
	return;
}
function hdotn() {
	var n = tos;
	DROP();
	tos = tos << 32 - n * 4 | tos >>> n * 4;
	for(; n > 0; n--){
		oDIG();
		eDIG();
	}
	DROP();
}
function hdot() {
	for(var i = 8; i > 0; i--){
		oDIG();
		eDIG();
	}
	DROP();
}

function keyboard() {
	text1();
	DUP_();
	tos = keyc;
	color();
	rm = hc * iw;
	lm = hp - 9 * iw + 3;
	xy = [vp-4*ih+3, hp-9*iw+3];
	var k = 0;
	for(var i = 0; i < 3; i++){
		k += 12;
		for(var j = 0; j < 4; j++){
			DUP_();
			tos = board[k++];
			emit();
		}
		space();
		k -= 16;
		for(var j = 0; j < 4; j++){
			DUP_();
			tos = board[k++];
			emit();
		}
	}
	cr();
	xy[1] += 4 * iw;
	var k = 4;
	for(var j = 0; j < 3; j++){
		DUP_();
		tos = shift[k++];
		emit();
	}
	lm = 3;
	xy[1] = 3;
	for(var i = 0; i < god_data.length - 1; i++){
		DUP_();
		tos = god_data[i];
		qdot();
	}
	xy[1] = hp - (11 + 9) * iw + 3;
	for(var j = 0; j < 11; j++){
		DUP_();
		tos = history_[j];
		emit();
	}
}

function mpad() {
	dict[here] = INS_DUP;
	dict[here+1] = INS_SETTOS;
	dict[here+2] = here + 6;
	dict[here+3] = INS_FORTH;
	dict[here+4] = 1;
	dict[here+5] = INS_SEMI;
	here += 6;
}

function $pad() {
	board = [];
	var t = tos + 28 * 2;
	var v = dict[t];
	shift = [nul, nul, nul, nul, v&0xff, v>>8&0xff, v>>16&0xff, v>>24&0xff];
	t++;
	for(var i = 0; i < 28; i++)
		board.push(dict[t + (i>>2)] >> ((i & 3) << 3) & 0xff);
	t = tos + 1;
	DROP();
	function loop(){
		ret.push(() => {
			let n = dict[t + 2*tos];
			DROP();
			ret.push(loop);
			ret.push(forth2[n]);
		});
		ret.push($KEY);
	}
	ret.push(loop);
}

var bas = dot10;
var blk = 18;
var curs = 0;
var cad = 0;
var pcad = 0;
var lcad = 0;
var trash = [];
var ekbd = [
	0o17, 0o01, 0o15, 0o55,
	0o14, 0o26, 0o20, 0o01,
	0o43, 0o11, 0o12, 0o53,
	0o00, 0o70, 0o72, 0o02,
	0o00, 0o00, 0o00, 0o00,
	0o00, 0o00, 0o00, 0o00,
];
var ekbd0 = [nul, nul, nul, nul, 0o25, 0o45, 7, 0];
var actc = [
	yellow, 0, 0xff0000, 0xc000,
	0, 0, 0xffff,
	0, 0xffffff, 0xffffff, 0xffffff, 0x8080ff
];
var action = 1;

function $EDIT() {
	blk = tos;
	DROP();
	ret.push($E);
}
function $E() {
	DUP_();
	tos = blk;
	anumber = $FORMAT;
	alpha0[4] = 0o45;
	alpha0[1] = $E0;
	ret.push($E0_);
	ret.push($REFRESH);
}
function $E0() {
	DROP();
	ret.push($E0_);
}
function $E0_() {
	shift = ekbd0;
	board = ekbd;
	keyc = yellow;
	function loop() {
		ret.push(() => {
			ret.push(() => { DROP(); ret.push(loop); });
			if(tos < ekeys.length)
				ret.push(ekeys[tos]);
		});
		ret.push($KEY);
	}
	ret.push(loop);
}

function $FORMAT() {
	if((action & 0o12) != 0){
		DROP();
		return;
	}
	if((tos & 0xFC000000) != 0 && (tos & 0xFC000000) != 0xFC000000){
		DUP_();
		tos = 1;
		if(action != 4)
			tos = 3;
		if(base != 10)
			tos ^= 0o20;
		let t = data[data.length - 1];
		data[data.length - 1] = tos;
		tos = t;
		words = 2;
	}else{
		tos = tos << 5 ^ 2;
		if(action != 4)
			tos ^= 0o13;
		if(base != 10)
			tos ^= 0o20;
		words = 1;
	}
	ret.push($INSERT);
}

function unPACK() {
	DUP_();
	if(tos >= 0) {
		data[data.length - 1] <<= 4;
		tos = tos << 4 | tos >>> 28;
		tos &= 7;
		return tos;
	}
	tos <<= 1;
	if(tos >= 0){
		data[data.length - 1] <<= 5;
		tos = tos << 4 | tos >>> 28;
		tos = tos & 7 ^ 0o10;
		return tos;
	}
	data[data.length - 1] <<= 7;
	tos = tos << 6 | tos >>> 26;
	tos = (tos & 0o77) - 0o20;
	return tos;
}

function $INSERT() {
	var t = insert0();
	if(t !== undefined)
		write(t, read(t) ^ action);
	else
		console.log("BUG");
	ret.push($ACCEPT);
}

function insert0() {
	if(((lcad + words ^ lcad) & -0x100) != 0){
		for(var i = words; i > 0; i--)
			DROP();
		return;
	}
	if(lcad > cad)
		memmove(cad + words, cad, lcad - cad);
	curs = cad + words;
	var t = curs;
	for(var i = words; i > 0; i--){
		write(--t, tos);
		DROP();
	}
	next = t;
	return t;
}

function blank() {
	xy = [0, 0];
	DUP_();
	tos = 0;
	color();
	DUP_();
	tos = hp;
	DUP_();
	tos = vp;
	box();
}

function qRING() {
	DUP_();
	data[data.length - 1]++;
	if(curs == next)
		curs = tos;
	if(tos != curs){
		if(tos < curs)
			pcad = next;
		DROP();
		return;
	}
	cad = next;
	xy[1] -= iw;
	DUP_();
	tos = 0xe04000;
	color();
	tos = 0o60;
	let c = xy[1] - rm;
	emit();
	if(c >= 0) xy[1] -= iw;
}

function $REFRESH() {
	function ref1() {
		if((read(next) & 0xf) != 0)
			qRING();
		var t = read(next++);
		if((t & 0o20) != 0)
			bas = dot;
		else
			bas = dot10;
		ret.push(ref1);
		ret.push(display[t & 0o17]);
	}
	ret.push(() => {
		blank();
		text1();
		DUP_();
		cad = lcad;
		tos = 0;
		pcad = blk << 8;
		next = pcad;
		ret.push(ref1);
	});
	ret.push($SHOW);
}
var display = (function() {
	function rW() {
		if(xy[1] != lm)
			cr();
		RED();
		type1();
	}
	function gW() { GREEN(); type1(); }
	function mW() { CYAN(); type1(); }
	function wW() { DUP_(); tos = yellow; color(); type1(); }
	function $type0() {
		xy[1] -= iw;
		if((read(next - 1) & -0o20) != 0)
			type1();
		else{
			lcad = --next;
			space();
			qRING();
			ret.pop();
			DROP();
			ret.push(keyboard);
		}
	}
	function Cap() {
		WHITE();
		DUP_();
		tos = read(next - 1) & -0o20;
		unPACK();
		tos += 48;
		emit();
		type2();
	}
	function CAPS() {
		WHITE();
		DUP_();
		tos = read(next - 1) & -0o20;
		while(unPACK()){
			tos += 48;
			emit();
		}
		space();
		DROP();
		DROP();
	}
	function text() { WHITE(); type1(); }
	function type1() {
		DUP_();
		tos = read(next - 1) & -0o20;
		type2();
	}
	function type2() {
		while(unPACK())
			emit();
		space();
		DROP();
		DROP();
	}
	function gsW() {
		gnW1(read(next - 1) >> 5);
	}
	function var_() {
		MAGENTA();
		type1();
		gnW();
	}
	function gnW() {
		gnW1(read(next++));
	}
	function gnW1(t) {
		DUP_();
		tos = bas == dot10 ? 0xf800 : 0xc000;
		color();
		DUP_();
		tos = t;
		bas();
	}
	function sW() {
		nW1(read(next - 1) >> 5);
	}
	function nW() {
		nW1(read(next++));
	}
	function nW1(t) {
		DUP_();
		tos = bas == dot10 ? yellow : 0xc0c000;
		color();
		DUP_();
		tos = t;
		bas();
	}
	return [
		$type0, wW, nW, rW,
		gW, gnW, gsW, mW,
		sW, text, Cap, CAPS,
		var_, nul, nul, nul
	];

})();

var ekeys = (function() {
	function $actn() {
		keyc = tos;
		ret.pop();
		DROP();
		ret.push($ACCEPT);
	}
	function $act(n) {
		return () => {
			action = n;
			tos = actc[action - 1];
			aword = $INSERT;
			ret.push($actn);
		};
	}
	function $actv() {
		action = 12;
		tos = 0xff00ff;
		aword = () => {
			DUP_();
			tos = 0;
			words++;
			ret.push($INSERT);
		};
		ret.push($actn);
	}
	function mcur() {
		if(curs > 0)
			curs--;
	}
	function pcur() {
		curs++;
	}
	function mmcur() {
		if(curs >= 8)
			curs -= 8;
		else
			curs = 0;
	}
	function ppcur() {
		curs += 8;
	}
	function pblk() {
		blk += 2;
		data[data.length - 1] += 2;
	}
	function mblk(){
		if(blk >= 20){
			blk -= 2;
			data[data.length - 1] -= 2;
		}
	}
	function shadow() {
		blk ^= 1;
		data[data.length - 1] ^= 1;
	}
	function $eout() {
		ret.pop();
		DROP();
		DROP();
		aword = $EX1;
		anumber = nul;
		alpha0[4] = 0;
		alpha0[1] = $nul0;
		keyc = yellow;
		ret.push($ACCEPT);
	}
	function enstack() {
		for(var t = cad - 1; t >= pcad; t--)
			trash.push(read(t));
		trash.push(cad - pcad);
	}
	function DEL() {
		enstack();
		memmove(pcad, cad, lcad - pcad);
		mcur();
	}
	function destack() {
		if(trash.length == 0)
			return;
		words = trash.pop();
		for(var i = words; i > 0; i--){
			DUP_();
			tos = trash.pop();
		}
		insert0();
	}
	return [
		nul, DEL, $eout, destack,
		$act(1), $act(3), $act(4), shadow,
		mcur, mmcur, ppcur, pcur,
		mblk, $actv, $act(7), pblk,
		nul, $act(11), $act(10), $act(9),
		nul, nul, nul, nul
	];
})();

function log() {
	console.log(data, tos);
}

function debug() {
	debugger;
}

function erase() {
	var n = tos << 8; DROP();
	var a = tos << 8; DROP();
	mem.fill(0, a, a + n);
}

function $copy() {
	if(tos < 12) ret.push($ABORT1);
	var a = tos; DROP();
	memmove(a << 8, blk << 8, 256);
	blk = a;
}

function master() {
	try {
		for(var i = 0; i < 1000; i++)
			ret.pop()();
		setTimeout(master, 0);
	}catch(e){
		if(e !== sleepmagic)
			throw e;
	}
}

function common(t) { }
function Basic(id, s, n) { this.id = id; this.stat = s; this.next = [n]; common(this); }
function Semi(id) { this.id = id; this.next = []; common(this); }
function JSCall(id, f, n) { this.id = id; this.fun = f; this.next = [n]; common(this); }
function Cond(id, c, t, e) { this.id = id; this.cond = c; this.next = [t,e]; common(this); }
function Next(id, c, t, e) { this.id = id; this.cond = c; this.next = [t,e]; common(this); }

Basic.prototype.mktext = function(n) { return this.stat + "\n" + n[0]; };
Semi.prototype.mktext = function(n) { return ""; };
JSCall.prototype.mktext = function(n) {
	var s = "";
	if(n[0] != "")
		s += "ret.push(() => {" + n[0] + "});\n"
	s += "ret.push(" + this.fun + ");"
	return s;
};
Cond.prototype.mktext = function(n) { return "if(" + this.cond + ") {\n" + n[0] + "} else {\n" + n[1] + "}"; };
Next.prototype.mktext = function(n) { return "if(--ret[ret.length - 1] " + this.cond + ") {\n" + n[0] + "} else {\nret.pop();\n" + n[1] + "}"; };

var jit_instrs = [];

function jit_instr(h) {
	switch(dict[h]){
	case INS_NOP: return new Basic(h, '', h + 1);
	case INS_SEMI: return new Semi(h, );
	case INS_DUP: return new Basic(h, "data.push(tos);", h + 1);
	case INS_DROP: return new Basic(h, "tos = data.pop() | 0;", h + 1);
	case INS_SETTOS: return new Basic(h, "tos = " + dict[h+1] + ";", h + 2);
	case INS_NOT: return new Basic(h, "tos = ~tos;", h + 1);
	case INS_PUSH: return new Basic(h, "ret.push(tos);", h + 1);
	case INS_POP: return new Basic(h, "tos = ret.pop();", h + 1);
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

	case INS_FORTH: return new JSCall(h, "forth2[" + dict[h+1] + "]", h+2);
	case INS_MACRO: return new JSCall(h, "macro2[" + dict[h+1] + "]", h+2);
	case INS_JYES: return new Cond(h, "flag", dict[h+1], h+2);
	case INS_JNO: return new Cond(h, "!flag", dict[h+1], h+2);
	case INS_NEXT: return new Next(h, "> 0", dict[h+1], h+2);
	case INS_0NEXT: return new Next(h, ">= 0", dict[h+1], h+2);
	default: throw "invalid opcode " + dict[h];
	}
}

function jit_instr_loop(start) {
	if(start in jit_instrs) return jit_instrs[start];
	var qu = [start];
	while(qu.length != 0){
		let h = qu.shift();
		if(h instanceof Function) {h();continue;}
		if(h in jit_instrs) continue;
		let p = jit_instr(h);
		jit_instrs[h] = p;
		p.next.forEach(x => {
			if(!(x in jit_instrs))
				qu.push(x);
		});
		if(p.next.length != 0)
			qu.push(() => {
				for(var i = 0; i < p.next.length; i++)
					p.next[i] = jit_instrs[p.next[i]];
			});
	}
	return jit_instrs[start];
}

function jit_unfold(p) {
	if(p.text !== undefined) return;
	var seen = {};
	var named = {};
	var namectr = 0;
	var qu = [p];
	while(qu.length != 0){
		let h = qu.pop();
		if(h instanceof Function) {h(); continue;}
		if(seen[h.id]) continue;
		seen[h.id] = true;
		qu.push(() => {
			let n = h.next.map(x => {
				if(x.text === undefined){
					named[x.id] = '_' + namectr++;
					return "ret.push(" + named[x.id] + ");"
				}else
					return x.text;
			});
			let t = h.mktext(n);
			if(named[h.id])
				h.text = "function " + named[h.id] + "() {\n" + t + "}\nret.push(" + named[h.id] + ");";
			else
				h.text = t;
		});
		h.next.forEach(x => {
			if(!seen[x.id])
				qu.push(x);
		});
	}
}

function jit(h) {
	var p = jit_instr_loop(h);
	jit_unfold(p);
	return new Function(p.text);
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

var macro0 = [
	";",
	"dup",
	"?dup",
	"drop",
	"then",
	"begin",
	"pad",
].map(x => enchuck(x)[0]);

var forth0 = [
	"warm",
	".pad",
	"pause",
	"macro",
	"forth",
	"c",
	"act",
	"show",
	"load",
	"here",
	"?lit",
	",",
	"accept",
	"erase",
	"copy",
	"mark",
	"empt",
	"emit",
	"digit",
	"2emit",
	".",
	"h.",
	"h.n",
	"cr",
	"space",
	"edit",
	"e",
	"text",
	"keyboard",
	"at",
	"+at",
	"xy",
	"box",
	"color",
	"unpack",
	"log",
	"line",
	"debug",
	"delay"
].map(x => enchuck(x)[0]);

var macro2 = [
	semi,
	cdup,
	qdup,
	cdrop,
	then,
	begin,
	mpad
];

var forth2 = [
	$start,
	$pad, // entry-number hardcoded
	$PAUSE,
	MACRO,
	FORTH,
	c_,
	$ACT,
	$SHOW,
	$LOAD,
	HERE,
	qlit,
	comma,
	$ACCEPT,
	erase,
	$copy,
	mark,
	empty,
	emit,
	eDIG,
	emit2,
	dot10,
	hdot,
	hdotn,
	cr,
	space,
	$EDIT,
	$E,
	text1,
	keyboard,
	AT,
	pAT,
	xy_,
	box,
	color,
	unPACK,
	log,
	line,
	debug,
	delay
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
