"use strict";
var hp = 1024;
var vp = 768;
var canvas, ctx;
var fore, forestr;
var xc = 0;
var yc = 0;
var xy = [3, 3];

function LRU(N, mask) {
	this.N = N;
	this.next = new Array(N+1);
	this.prev = new Array(N+1);
	for(var i = N; i >= 0; i--){
		if(i == N || (i & ~mask) == 0){
			this.next[i] = i;
			this.prev[i] = i;
			this.used(i);
		}
	}
}
LRU.prototype.used = function(i) {
	this.next[this.prev[i]] = this.next[i];
	this.prev[this.next[i]] = this.prev[i];
	this.next[i] = this.next[this.N];
	this.prev[i] = this.N;
	this.next[this.N] = i;
	this.prev[this.next[i]] = i;
}
LRU.prototype.get = function() {
	return this.prev[this.N];
}

var fontcache = (function(){
	var canvas, ctx, data, buf;
	var state = [];
	var r = {};
	var chars = {};
	var N = 256;
	var by = 16;
	var bmask = N - 1 & ~(by | 1);
	var slots = new Array(N);
	var lru = new LRU(N, -1);
	var lrub = new LRU(N, bmask);
	
	function sx(i) { return (i & by - 1) * 16; }
	function sy(i) { return (i >> 4) * 24; }
	r.init = function() {
		canvas = document.createElement('canvas');
		canvas.width = by*16;
		canvas.height = (N/by|0)*24;
		ctx = canvas.getContext('2d');
		data = ctx.createImageData(16*2, 24*2);
		buf = new Uint32Array(data.data.buffer);
		for(var i = 0; i < 64; i++)
			slots[i] = '';
	};
	function used(i, big) {
		lru.used(i);
		lrub.used(i & bmask);
		if(big){
			lru.used(i ^ 1);
			lru.used(i ^ by);
			lru.used(i ^ by ^ 1);
		}
	}
	function set1(i, ch, col, big) {
		delete chars[slots[i]];
		slots[i] = [ch, col, big].toString();
	}
	function set(i, ch, col, big) {
		set1(i, ch, col, big);
		if(big){
			set1(i^1, ch, col, big);
			set1(i^by, ch, col, big);
			set1(i^by^1, ch, col, big);
		}
	}
	function populate(i, ch, col, big) {
		var l = 12*256 + 16*24/(8*4)*tos;
		var p = 0;
		var w;
		for(var y = 24; --y >= 0; ){
			if((y & 1) != 0){
				w = read(l++);
				w = w << 16 | w >>> 16;
				w = w << 8 & 0xff00ff00 | w >> 8 & 0x00ff00ff;
			}
			for(var x = 16; --x >= 0; ){
				if(big){
					buf[p] = w >> 31 ? col : 0;
					buf[p+1] = w >> 31 ? col : 0;
					buf[p+32] = w >> 31 ? col : 0;
					buf[p+33] = w >> 31 ? col : 0;
					p += 2;
				}else{
					buf[p++] = w >> 31 ? col : 0;
				}
				w <<= 1;
			}
			if(big)
				p += 32;
			else
				p += 16;
		}
		if(big)
			ctx.putImageData(data, sx(i), sy(i));
		else
			ctx.putImageData(data, sx(i), sy(i), 0, 0, 16, 24);
	};
	function get(ch, col, big) {
		var s = [ch, col, big].toString();
		var i = chars[s];
		if(i === undefined){
			i = big ? lrub.get() : lru.get();
			chars[s] = i;
			set(i, ch, col, big);
			populate(i, ch, col, big);
		}
		used(i, big);
		return i;
	}
	r.draw = function(targctx, x, y, ch, col, big) {
		var i = get(ch, col, big);
		if(big)
			targctx.drawImage(canvas, sx(i), sy(i), 32, 48, x, y, 32, 48);
		else
			targctx.drawImage(canvas, sx(i), sy(i), 16, 24, x, y, 16, 24);
	};
	return r;
})();

function color() {
	fore = tos << 16 & 0xff0000 | tos & 0xff00 | tos >> 16 & 0xff | 0xff << 24;
	var s = (tos & 0xffffff).toString(16);
	s = "#" + "0".repeat(6 - s.length) + s;
	forestr = s;
	DROP();
}
builtin("color", color);

function gfxinit() {
	canvas = document.getElementById('canvas');
	canvas.addEventListener('keydown', keypressed);
	ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	fontcache.init();
}

function $SWITCH() {
	ret.push($PAUSE);
}

function AT() {
	xy[0] = tos & 0xffff;
	DROP();
	xy[1] = tos & 0xffff;
	DROP();
}
builtin("at", AT);

function pAT() {
	xy[0] = xy[0] + tos & 0xffff;
	DROP();
	xy[1] = xy[1] + tos & 0xffff;
	DROP();
}
builtin("+at", pAT);

function xy_() {
	DUP_();
	tos = xy[0] & 0xffff | xy[1] << 16;
}
builtin("xy", xy_);

function clip() {
	yc = xy[0];
	if((yc & 0x8000) != 0) yc = 0;
	yc &= 0xffff;
	xc = xy[1];
	if((xc & 0x8000) != 0) xc = 0;
	xc &= 0xffff;
	return [yc, xc];
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
	ctx.fillStyle = forestr;
	ctx.fillRect(d[1], d[0], x, y);
}
builtin("box", box);

function line() {
	var d, n;

	d = clip();
	n = tos;
	DROP();
	d -= tos;
	DROP();
	ctx.fillStyle = forestr;
	ctx.fillRect(d[1], d[0], x, 1);
	xy[0]++;
}
builtin("line", line);

var iw = 16 + 6;
var ih = 24 + 6;
var hc = hp / iw | 0;
var vc = vp / ih | 0;
var lm = 3;
var rm = hc * iw;
var xycr = 0;

function emit() {
	qcr();
	var d = clip();
	fontcache.draw(ctx, d[1], d[0], tos, fore, false);
	DROP();
	xy[1] += iw;
}
builtin("emit", emit);

function emit2() {
	var d = clip();
	fontcache.draw(ctx, d[1], d[0], tos, fore, true);
	DROP();
	xy[1] += iw*2;
}
builtin("2emit", emit2);

function text1() {
	WHITE();
	lm = 3;
	rm = hc * iw;
	xy = [3, lm];
	xycr = [3, lm];
}
builtin("text", text1);

function qcr() {
	if(xy[1] >= rm) cr();
}
function cr() {
	xy[0] += ih;
	xy[1] = lm;
}
builtin("cr", cr);

function space() {
	xy[1] += iw;
}
builtin("space", space);

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
builtin(".", dot10);

var hicon = [
	0o30, 0o31, 0o32, 0o33, 0o34, 0o35, 0o36, 0o37,
	0o40, 0o41, 0o05, 0o23, 0o12, 0o20, 0o04, 0o16
];
	
function eDIG1() { DUP_(); eDIG(); }
function eDIG() {
	tos = hicon[tos];
	emit();
}
builtin("digit", eDIG);
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
builtin("h.n", hdotn);
function hdot() {
	for(var i = 8; i > 0; i--){
		oDIG();
		eDIG();
	}
	DROP();
}
builtin("h.", hdot);

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
builtin("keyboard", keyboard);

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
var pad_fn = forth2.length;
builtin(".pad", $pad);

function mpad() {
	dict[here] = INS_DUP;
	dict[here+1] = INS_SETTOS;
	dict[here+2] = here + 6;
	dict[here+3] = INS_FORTH;
	dict[here+4] = pad_fn;
	dict[here+5] = INS_SEMI;
	here += 6;
}
builtin_macro("pad", mpad);

var yellow = 0xffff00;
function WHITE() { DUP_(); tos = 0xffffff; color(); }
function CYAN() { DUP_(); tos = 0xffff; color(); }
function MAGENTA() { DUP_(); tos = 0xff00ff; color(); }
function SILVER() { DUP_(); tos = 0xc0c0c0; color(); }
function BLUE() { DUP_(); tos = 0x4040ff; color(); }
function RED() { DUP_(); tos = 0xff0000; color(); }
function GREEN() { DUP_(); tos = 0x8000ff00; color(); }
var keyc = yellow;
