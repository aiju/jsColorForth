"use strict";
/*
   ( white words )
   [ yellow words ]
   [[ cyan words ]]
   : redword 
   & magentaword 12345
   
   #16  switch block 
   $2A  hex constant
   $$0  number as text word (not number)
   =expr  replaced with eval("expr")
*/

var forth = `
#18
( jscolorforth )
[ 24 load 26 load 28 load 30 load ] 
: dump 32 load ; 
: icons 34 load ; 
: colors 56 load ;
[ mark empty ] 
#24
( Wordcode ) [ macro ] 
: t! =INS_TBANG , , [[ drop ]] ;
: t@ [[ ?dup ]] =INS_TAT , , ;
: swap 0 [[ t! ]] 1 [[ t! ]] 0 [[ t@ ]] 1 [[ t@ ]] ;
: if =INS_JNO , $0 , here ;
: 2* =INS_LSH , ;
: 2/ =INS_ASR , ;
: @ =INS_AT , ;
: ! =INS_BANG , [[ drop drop ]] ;
: nip =INS_NIP , ;
: + =INS_ADD , ;
: or =INS_OR , ;
: and =INS_AND , ;
: u+ =INS_UPLUS , [[ drop ]] ;
: ? =INS_TEST , [[ drop ]] ;
: less =INS_LESS , ;
: over [[ ?dup ]] =INS_OVER , ;
: push =INS_PUSH , [[ drop ]] ;
: pop [[ ?dup ]] =INS_POP , ;
: - =INS_NOT , ;
#25
( Wordcode macros: , compiles 1 word )
: t! ( set temporary )
: t@ ( read temporary )
: if ( uses global flag )
: then ( fix address - in kernel )
: u+ ( add to 2nd number )
#26
( macros ) 
: for [[ push begin ]] ;
: next =INS_NEXT , , ;
: -next =INS_0NEXT , , ;
: i [[ ?dup ]] =INS_POP , =INS_PUSH , ;
: +! =INS_TBANG , 0 , [[ @ + ]] 0 [[ t@ ! ]] ;
: or! =INS_TBANG , 0 , [[ @ or ]] 0 [[ t@ ! ]] ;
: nop =INS_NOP , ;
: * =INS_MUL , ;
: */ =INS_MULDIV , [[ nip nip ]] ;
: / =INS_DIV , ;
: mod =INS_MOD , ;
: /mod [[ over over mod ]] 0 [[ t! / ]] 0 [[ t@ ]] ;
#27
#28
( Compiled macros ) 
[ forth ] 
: @ @ ; 
: ! ! ;
: + + ;
: */ */ ;
: * * ;
: / / ;
: 2* 2* ;
: 2/ 2/ ;
: dup dup ; ( Arithmetic ) 
: negate - 1 + ; 
: min less if drop ; then swap drop ; 
: abs dup negate 
: max less if swap then drop ; 
: v+ ( vv-v ) push u+ pop + ; 
( writes )
( reads )
( oadf )
( save )
#29
( These macros may be white, others may not ) 
: @ etc ( Arithmetic ) 
: negate n-n ( when you just cant use ) - 
: min nn-n ( minimum ) 
: abs n-u ( absolute value ) 
: max nn-n ( maximum ) 
: v+ vv-v ( add 2-vectors ) 
: nc -a ( number of cylinders booted ) 
: save ( write colorforth to bootable floppy ) 
: oadf ( save as spelled by qwerty. For typing with blank screen ) 
#30
( Colors etc ) 
: block $100 * ; 
: white $ffffff color ; 
: red $ff0000 color ; 
: green $ff00 color ; 
: blue $ff color ; 
: silver $bfbfbf color ; 
: black 0 color ; 
: screen 0 dup at 1024 768 box ; 
: 5* 5 for 2emit next ; 
: cf 25 dup at red $1 $3 $c $3 $a 5* green $14 $2 $1 $3 $3e 5* ; 
: logo show black screen 800 710 blue box 600 50 at 1024 620 red box 200 100 at 700 500 green box text cf keyboard ; 
: empty empt logo ; 
#31

: block n-a ( block number to word address ) 
: colors ( specified as rgb: 888 ) 
: screen ( fills screen with current color ) 
: at xy ( set current screen position ) 
: box xy ( lower-right of colored rectangle ) 
: dump ( compiles memory display ) 
: print ( compiles screen print ) 
: icon ( compiles icon editor ) 
: logo ( displays colorforth logo ) 
: show ( background task executes following code repeatedly ) 
: keyboard ( displays keypad and stack ) 
#32
( Dump ) & x 2097152 & y 2101760 
: one dup @ h. space dup h. cr ; 
: lines for one 4294967295 + next drop ; 
: dump x ! 
: r show black screen x @ 15 + 16 text lines keyboard ; 
: it @ + @ dup h. space ; 
: lines for white i [ x ] it i [ y ] it or drop if red then i . cr -next ; 
: cmp show blue screen text 19 lines red [ x ] @ h. space [ y ] @ h. keyboard ; 
: u 16 
: +xy dup [ x ] +! [ y ] +! ; 
: d 4294967280 +xy ; 
: byte 4 / dump ; 
: fix for 0 over ! 1 + next ; [ dump ] 
#33
( Does not say empty, compiles on top of application ) 
: x -a ( current address ) 
: one a-a ( line of display ) 
: lines an 
: dump a ( background task continually displays memory ) 
: u ( increment address ) 
: d ( decrement ) 
: byte a ( byte address dump ) 
: fix an-a ( test word ) 
#34
( Icons ) [ empty macro ] 
( @w !w *byte )
[ forth ] & ic 0 & cu 351 
: sq xy $10000 /mod 16 + swap 16 + box 17 0 +at ; 
: loc [ ic ] @ [ 16 24 8 */ ] * [ 12 block 4 * ] + ; 
: 0/1 $8000 ? if green sq ; then blue sq ; 
: row dup @w *byte 16 for 0/1 2* next drop [ 4294967279 16 * ] 17 +at ; 
: ikon loc 24 for row 2 + next drop ; 
: adj 17 * swap ; 
: cursor [ cu ] @ 16 /mod adj adj over over at red 52 u+ 52 + box ; 
: ok show black screen cursor 18 dup at ikon text [ ic ] @ . keyboard ; [ 36 load ok h ] 
#35
( Draw big-bits icon ) 
: @w a-n ( fetch 16-bit word from byte address ) 
: !w na ( store same ) 
: *byte n-n ( swap bytes ) 
: ic -a ( current icon ) 
: cu -a ( cursor ) 
: sq ( draw small square ) 
: xy -a ( current screen position, set by ) at 
: loc -a ( location of current icons bit-map ) 
: 0/1 n-n ( color square depending on bit 15 ) 
: row a-a ( draw row of icon ) 
: +at nn ( relative change to screen position ) 
: ikon ( draw big-bits icon ) 
: adj nn-nn ( magnify cursor position ) 
: cursor ( draw red box for cursor ) 
: ok ( background task to continually draw icon, icon number at top ) 
#36
( Edit ) 
: +ic 1 [ ic ] +! ; 
: -ic [ ic ] @ 4294967295 + 0 max [ ic ] ! ; 
: bit [ cu ] @ 2/ 2/ 2/ 2/ 2* loc + $10000 [ cu ] @ $f and 1 + for 2/ next *byte ; 
: toggle bit over @w or swap !w ; 
: td toggle 
: d 16 
: wrap [ cu ] @ + [ 16 24 * ] dup u+ /mod drop [ cu ] ! ; 
: tu toggle 
: u 4294967280 wrap ; 
: tr toggle 
: r 1 wrap ; 
: tl toggle 
: l 4294967295 wrap ; 
: nul ; 
: h pad nul nul accept nul tl tu td tr l u d r -ic nul nul +ic nul nul nul nul nul nul nul nul nul nul nul nul [ $2500 , $110160c dup , , $2b000023 , 0 , 0 , 0 , ] 
#37
( Edit icon ) 
#38
#40
#42
#44
#45
#46
#48
( ASCII ) [ macro ] 
( 1@ ) [ forth ] 
: string pop ; 
: cf-ii string [ $6f747200 , $696e6165 , $79636d73 , $7766676c , $62707664 , $71757868 , $336a7a6b , $37363534 , $2d313938 , $2f322e30 , $2b213a3b , $3f2c2a40 , ] 
: ch $fffffff0 and unpack [ cf-ii ] + 1@ $ff and ; 
: ii-cf string [ $2a00 , 0 , $2b2d0000 , $2725232e , $1b262224 , $1f1e1d1c , $28292120 , $2f000000 , $3a43355c , $3d3e3440 , $484a3744 , $3336393c , $38314742 , $3f414632 , $493b45 , 0 , $a13052c , $d0e0410 , $181a0714 , $306090c , $8011712 , $f111602 , $190b15 , ] 
: chc $ffffffe0 + [ ii-cf ] + 1@ $ff and ; 
#50
( Clock ) [ macro ] 
( p@ ) 
( p! ) [ forth ] 
: ca $70 a! p! $71 a! ; 
: c@ ca 0 p@ ; 
: c! ca p! ; 
: hi 10 c@ $80 and drop if ; then hi ; 
: lo 0 p@ $80 and drop if lo ; then ; 
: bcd c@ 16 /mod 10 * + ; 
: hms0 4 bcd 100 * 2 bcd + 100 * 0 bcd + ; 
: hms hms0 2 ms dup hms0 or drop if drop hms ; then ; 
: ymd 9 bcd 100 * 8 bcd + 100 * 7 bcd + ; 
: day 6 c@ 4294967295 + ; 
: cal hi lo time - hi lo time + ( 748 ) ; 
#52
#54
#55
#56
( Hexagon ) [ empty ] & col 0 & del 2105376 
: lin dup 2/ 2/ dup 2* line ; 
: hex xy 7 and over 2/ for lin 7 + next over for lin next swap 2/ for 4294967289 + lin next drop ; 
: +del [ del ] @ nop 
: petal and [ col ] @ + $f8f8f8 and color 100 hex ; 
: -del [ del ] @ $f8f8f8 or $80808 + ; 
: rose 0 +del 4294967120 4294967096 +at $f80000 -del petal 352 4294967096 +at $f80000 +del 4294967032 4294966947 +at $f800 -del petal 176 4294967096 +at $f8 +del 4294967120 98 +at $f8 -del petal 176 4294967096 +at $f800 +del ; 
: ok show black screen 512 282 at rose text [ col ] @ h. space [ del ] @ $ff and . keyboard ; [ 58 load ok h ] 
#57
( Draws 7 hexagons. Colors differ along red, green and blue axes. ) 
: col ( color of center hexagon ) 
: del ( color difference ) 
: lin n ( draws 1 horizontal line of a hexagon ) 
: hex n ( draws top, center and bottom. Slope 7 x to 4 y is 1.750 compared to 1.732 ) 
: +del n ( increment color ) 
: -del n 
: petal n ( draw colored hexagon ) 
: rose ( draw 7 hexagons ) 
: ok ( describe screen. Center color at top ) 
#58
( Pan ) 
: in [ del ] @ 2* $404040 min [ del ] ! ; 
: out [ del ] @ 2/ $80808 max [ del ] ! ; 
: r $f80000 
: +del [ del ] @ 
: +col and [ col ] @ + $f8f8f8 and [ col ] ! ; 
: g $f800 +del ; 
: b $f8 +del ; 
: -r $f80000 -del +col ; 
: -g $f800 -del +col ; 
: -b $f8 -del +col ; 
: nul ; 
: h pad nul nul accept nul -r -g -b nul r g b nul out nul nul in nul nul nul nul nul nul nul nul nul nul nul nul [ $250000 , $130d01 dup , , $2b000023 , 0 , 0 , 0 , ] 
#59
: in ( increment color difference ) 
: out ( decrement it ) 
: r 
: g 
: b ( increment center color ) 
: -r 
: -g 
: -b ( decrement it ) 
: +del ( redefine with ; ) 
: +col ( change center color ) 
: nul ( ignore ) 
: h ( describe keypad ) 
#62
( Timing ) [ empty macro ] 
( out ) [ forth ] 
: tare time - 1000 for next time + ; 
: tare+ time - push 1000 for dup next c pop time + ; 
: test tare time + - 1000 for out next time + ; ( next 3 loop 5.7 /next 2 /swap 25 swap 7.2 ) [ macro ] 
: c! $c88b 2, [[ drop ]] here ; 
: loop $49 1, $75 1, ( e2 ) here - + 1, ; [ forth ] 
: try time - 1000 c! loop time + ; 
`;

function ctz(n) {
	var k;
	for(k = 0; (n & 1) == 0; k++)
		n >>= 1;
	return k;
}

function dechuck(w){
	var s, c;

	s = '';
	for(;;){
		if(w>>31 == 0){
			c = w >> 28 & 7;
			w <<= 4;
			if(c == 0)
				return s;
			s += ' rtoeani'[c];
		}else if((w >> 30 & 3) == 2){
			c = w >> 27 & 7;
			w <<= 5;
			s += 'smcylgfw'[c];
		}else{
			c = w >> 25 & 31;
			w <<= 7;
			s += 'dvpbhxuq0123456789j-k.z/;:!+@*,?'[c];
		}
	}
}

function do_comment(w) {
	var r = enchuck(w.toLowerCase());
	if(w.match(/^[a-z0-9\-./;:!+@*,?]+$/))
		r[0] |= 9;
	else if(w.match(/^[A-Z0-9\-./;:!+@*,?]+$/))
		r[0] |= 11;
	else if(w.match(/^[A-Z0-9\-./;:!+@*,?][a-z0-9\-./;:!+@*,?]+$/))
		r[0] |= 10;
	else
		throw 'invalid comment word ' + w;
	return r;
}

function do_number(w, hex, execute, magenta) {
	if(magenta)
		return [w];
	if(w >> 26 == 0 || w >> 26 == -1)
		return [w << 5 | hex << 4 | (execute ? 8 : 6)];
	else
		return [hex << 4 | (execute ? 2 : 5), w];
}

function do_word(w, execute, cyan, next) {
	var r = enchuck(w);
	if(next == 'red')
		r[0] |= 3;
	else if(next == 'magenta')
		r[0] |= 12;
	else if(execute)
		r[0] |= 1;
	else if(cyan)
		r[0] |= 7;
	else
		r[0] |= 4;
	return r;
}

function assemble(src) {
	var words = src.split(/[ \t\n]+/);
	var blocks = {};
	var cur = 0;
	var comment = false;
	var execute = false;
	var cyan = false;
	var next = '';
	for(var i = 0; i < words.length; i++){
		var w = words[i];
		var r = [];
		if(w == '') continue;
		if(w[0] == '=')
			w = eval(w.substring(1)).toString();
		if(w[0] == '#'){
			cur = parseInt(w.substring(1));
			if(!(cur in blocks))
				blocks[cur] = [];
		}else if(w == '(')
			comment = true;
		else if(comment){
			if(w == ')')
				comment = false;
			else
				r = do_comment(w);
		}else if(w == '['){
			if(execute || next != '') throw "syntax error";
			execute = true;
		}else if(w == ']'){
			if(!execute || next != '') throw "syntax error";
			execute = false;
		}else if(w == '[['){
			if(cyan || next != '') throw "syntax error";
			cyan = true;
		}else if(w == ']]'){
			if(!cyan || next != '') throw "syntax error";
			cyan = false;
		}else if(w == ':'){
			if(execute || cyan || next != '') throw "syntax error";
			next = 'red';
		}else if(w == '&'){
			if(execute || cyan || next != '') throw "syntax error";
			next = 'magenta';
		}else if(w.match(/^\$\$/)){
			if(next == 'magenta-num') throw "syntax error";
			r = do_word(w.substring(2), execute, cyan, next);
			next = '';
		}else if(w.match(/^\$[0-9a-fA-F]+$/)){
			if(cyan || (next != '' && next != 'magenta-num')) throw "syntax error";
			r = do_number(parseInt(w.substring(1), 16), true, execute, next == 'magenta-num');
			next = '';
		}else if(w.match(/^[0-9]+$/)){
			if(cyan || (next != '' && next != 'magenta-num')) throw "syntax error";
			r = do_number(parseInt(w), false, execute, next == 'magenta-num');
			next = '';
		}else{
			if(next == 'magenta-num') throw "syntax error";
			r = do_word(w, execute, cyan, next);
			if(next == 'magenta')
				next = 'magenta-num';
			else
				next = '';
		}
		blocks[cur].push.apply(blocks[cur], r);
	}
	var r = new Uint32Array(256 * 63);
	for(var i = 0; i < 63; i++){
		var b = blocks[i];
		if(b !== undefined)
			r.set(b, i * 256);
	}
	return r;
}

function output(file, b){
	const fs = require('fs');
	var f = fs.createWriteStream('out.bin', {options: 'wb'});
	for(var i = 0; i < 63; i++){
		f.write(Buffer.from(b[i].buffer));
	}
	f.end();
}
