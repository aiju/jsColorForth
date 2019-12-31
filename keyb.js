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
