"use strict";

function uint32array_eq(a,b) {
	if(a.length !== b.length) return false;
	for(let j = 0; j < a.length; j++)
		if((a[j]|0) !== (b[j]|0))
			return false;
	return true;
}

function disassemble(words) {
	function raw(n) {
		if(n < 0) n += 2**32;
		return '%' + n.toString(16);
	}
	var n;
	for(var n = words.length - 1; n >= 0; n--)
		if(words[n] != 0)
			break;
	n++;
	var output = [];
	let num;
	for(var i = 0; i < n; ){
		let i0 = i;
		let w = words[i++];
		if(w == 0){
			output.push(raw(0));
			continue;
		}
		let m = w & 15;
		switch(m){
		case 1: case 3: case 4: case 7: case 9: case 10: case 11: case 12:
			let s = dechuck(w & -16);
			if(m != 12)
				while(i < n && words[i] != 0 && (words[i] & 15) == 0)
					s += dechuck(words[i++] & -16);
			let t = enchuck(s);
			t[0] |= m;
			if(s == '' || !uint32array_eq(words.subarray(i0, i), t) || m == 10 && !s.match(/^[a-z]/) || m == 11 && !s.match(/[a-z]/)){
				for(let j = i0; j < i; j++)
					output.push(raw(words[j]));
				continue;
			}
			if(s.match(/^[0-9]+$/) || s == ':') s = '\\' + s;
			switch(m){
			case 1:
				output.push('['); output.push(s); output.push(']');
				break;
			case 3:
				output.push(':'); output.push(s);
				break;
			case 4:
				output.push(s);
				break;
			case 7:
				output.push('[['); output.push(s); output.push(']]');
				break;
			case 9:
				output.push('('); output.push(s); output.push(')');
				break;
			case 10:
				output.push('('); 
				output.push(s[0].toUpperCase() + s.substr(1));
				output.push(')');
				break;
			case 11:
				output.push('('); 
				output.push(s.toUpperCase());
				output.push(')');
				break;
			case 12:
				if(i == words.length)
					output.push(raw(w));
				else{
					output.push('&');
					output.push(s);
					num = words[i++];
					if(num < 0) num += 2**32;
					output.push(num);
				}
				break;
			}
			break;
		case 8: case 6:
			if(m == 8)
				output.push('[');
			num = w>>5<<5>>5;
			if(num < 0) num += 2**32;
			if((w & 0x10) != 0)
				output.push('$' + num.toString(16));
			else
				output.push(num.toString());
			if(m == 8)
				output.push(']');
			break;
		case 2: case 5:
			if(i == words.length){
				output.push(raw(w));
				continue;
			}
			if(w>>5 != 0 || (words[i+1]>>26) + 1 <= 1){
				output.push(raw(w));
				output.push(raw(words[i++]));
				continue;
			}
			if(m == 2)
				output.push('[');
			num = words[i++];
			if(num < 0) num += 2**32;
			if((w & 0x10) != 0)
				output.push('$' + num.toString(16));
			else
				output.push(num.toString());
			if(m == 2)
				output.push(']');
			break;
		default:
			output.push(raw(w));
			continue;
		}
	}
	let w = 0;
	for(let i = 0; i < output.length; i++){
		switch(output[i]){
		case ':': if(i > 0){ output[w++] = '\n:'; continue; } break;
		case ')': if(output[i+1] === '('){ i++; continue; } break;
		case ']': if(output[i+1] === '['){ i++; continue; } break;
		case ']]': if(output[i+1] === '[['){ i++; continue; } break;
		}
		output[w++] = output[i];
	}
	output.length = w;
	return output.join(' ');
}

function storage_write() {
	var n = tos++;;
	if(n >= 0 && n < mem.length/256){
		let d = mem.subarray(n*256, n*256+256);
		let s = disassemble(d);
		let t = assemble(s, true);
		if(!uint32array_eq(d, t)){
			console.log('trial reassembly failed!');
			console.log(d);
			console.log(s);
			console.log(t);
			s = Array.prototype.slice.call(d).map(x => '=' + (x < 0 ? x + 2**32 : x).toString(16)).join(' ');
		}
		localStorage.setItem('jsColorForth #' + n, s);
	}else
		console.log("invalid write arg " + n);
}
builtin("write", storage_write);

function storage_read() {
	var n = tos++;
	if(n >= 0 && n < mem.length/256){
		let d = localStorage.getItem('jsColorForth #' + n.toString());
		if(d === null) return;
		try{
			let data = assemble(d, true);
			mem.set(data, n * 256);
		}catch(e){
			console.log("invalid data in localStorage "+n);
		}
	}else
		console.log("invalid read arg " + n);
}
builtin("read", storage_read);

function nc() {
	DUP_();
	tos = mem.length/256;
}
builtin("nc", nc);
