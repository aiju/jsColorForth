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
