"use strict";

const diff = require("diff");

/** Token types */
const SPECIAL           = -1;
const NORMAL            = 0;
const REMOVAL           = 1;
const ADDITION          = 2;
const DIVIDER           = 3;
const CHAR_REMOVAL      = 4;
const CHAR_ADDITION     = 5;

/** SGR escape sequences for coloured terminal output */
const SGR_ADDED_CHAR    = "\x1B[48;5;28;38;5;82m";
const SGR_ADDED_LINE    = "\x1B[38;5;2m";
const SGR_NORMAL_LINE   = "\x1B[38;5;8m";
const SGR_REMOVED_CHAR  = "\x1B[48;5;88;38;5;196m";
const SGR_REMOVED_LINE  = "\x1B[38;5;1m";
const SGR_RESET_CHAR    = "\x1B[49;39m";
const SGR_RESET_LINE    = "\x1B[0m";


class Token{
	
	constructor(type, text = "", inline = false){
		this.type = type;
		this.inline = inline;
		
		if(!this.inline)
			this.text = text.replace(/^[-+ ]/, "");
		else
			this.text = text;
	}
	
	inspect(){ return this.toString() }
	toJSON(){  return this.toString() }
	
	toString(){
		switch(this.type){
			case NORMAL:        return SGR_NORMAL_LINE  + this.text + SGR_RESET_LINE;
			case REMOVAL:       return SGR_REMOVED_LINE + this.text + SGR_RESET_LINE;
			case ADDITION:      return SGR_ADDED_LINE   + this.text + SGR_RESET_LINE;
			case CHAR_REMOVAL:  return SGR_REMOVED_CHAR + this.text + SGR_RESET_CHAR;
			case CHAR_ADDITION: return SGR_ADDED_CHAR   + this.text + SGR_RESET_CHAR;
			case DIVIDER:       return "\n";
			case SPECIAL:       return this.text;
		}
	}
}


class Newline extends Token{
	
	constructor(resetStyle = false){
		super(SPECIAL, "\n");
		
		if(resetStyle)
			this.text = "\n" + SGR_RESET_LINE;
		else
			this.text = "\n";
	}
}


class ChangeBlock extends Token{
	
	constructor(lines, midpoint){
		super(SPECIAL);
		
		/** Highlight changes between adjacent lines */
		lines = lines.map(l => l.replace(/^[-+]/, ""));
		const removed = lines.slice(0, midpoint);
		const added   = lines.slice(midpoint);
		const changes = diff.diffWordsWithSpace(removed.join("\n"), added.join("\n"));
		this.tokens   = [];
		
		/** Show removals first */
		for(let c of changes){
			if(c.removed)     this.tokens.push(new Token(CHAR_REMOVAL, c.value, true));
			else if(!c.added) this.tokens.push(new Token(REMOVAL, c.value, true));
		}
		
		this.tokens.push(new Newline());
		
		/** Then show additions */
		for(let c of changes){
			if(c.added)         this.tokens.push(new Token(CHAR_ADDITION, c.value, true));
			else if(!c.removed) this.tokens.push(new Token(ADDITION, c.value, true));
		}
		this.tokens.push(new Newline(true));
	}
	
	toString(){
		let str = "";
		for(let i of this.tokens)
			str += i.toString();
		return str;
	}
}


class PatchPainter{
	
	format(input){
		const output = [];
		const lines  = input.split(/\n/g);
		let started  = false;
		let removals = [];
		let lastRemoval;
		
		for(let i = 0, l = lines.length; i < l; ++i){
			const line = lines[i];
			
			if(/^@@ /.test(line))
				started = true;
			
			else if(!started)
				continue;
			
			switch(line[0]){
				
				/** Removed line */
				case "-":
					if(lastRemoval == null)
						lastRemoval = i;
					removals.push(line);
					break;
				
				
				/** Inserted line */
				case "+":{
					
					/** There were removed lines right before an inserted one */
					if(lastRemoval != null){
						let lastAddition = lines.findIndex((el, index) => {
							const next = lines[index + 1];
							return index >= i && (next === undefined || next[0] !== "+");
						});
						output.splice(i, 0, new ChangeBlock(lines.slice(lastRemoval, lastAddition + 1), i - lastRemoval));
						i = lastAddition;
						
						lastRemoval = null;
						removals    = [];
						continue;
					}
					
					else output.push(
						new Token(ADDITION, line),
						new Newline()
					);
					break;
				}
				
				/** Surrounding lines/context */
				case " ":{
					if(removals.length !== 0)
						resetRemovals(i);
					
					output.push(
						new Token(NORMAL, line),
						new Newline()
					);
					break;
				}
				
				
				/** Divider */
				case "@":{
					if(removals.length !== 0)
						resetRemovals(i);
					
					if(output.length) output.push(new Token(DIVIDER));
					break;
				}
			}
		}

		/** Drop any collected removals into the returned array */
		function resetRemovals(from){
			const rm = [];
			for(let r of removals.map(n => new Token(REMOVAL, n)))
				rm.push(r, new Newline());
			output.splice(from, 0, ...rm);
			lastRemoval = null;
			removals    = [];
		}
		
		
		return output.map(i => i.toString()).join("");
	}
}

module.exports = new PatchPainter;
