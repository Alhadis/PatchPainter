"use strict";

const diff = require("diff");

/** Token types */
const SPECIAL           = -1;
const NORMAL            = 0;
const REMOVAL           = 1;
const ADDITION          = 2;
const CHAR_REMOVAL      = 3;
const CHAR_ADDITION     = 4;

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
			case SPECIAL:       return this.text;
		}
	}
}


class LineBreak extends Token{
	
	constructor(resetStyle = false){
		super(SPECIAL, "\n");
		
		if(resetStyle)
			this.text = "\n" + SGR_RESET_LINE;
		else
			this.text = "\n";
	}
}


class Divider extends LineBreak{
	constructor(){
		super(true);
	}
}



class ChangeBlock extends Token{
	
	constructor(lines, midpoint){
		super(SPECIAL);
		
		/** Highlight changes between adjacent lines */
		lines = lines.map(l => l.replace(/^[-+]/, ""));
		const removed = lines.slice(0, midpoint);
		const added   = lines.slice(midpoint);
		this.tokens   = [];
		
		const changes = [];
		diff.diffWordsWithSpace(removed.join("\n"), added.join("\n"))
			.forEach(diff => {
				
				if("\n" !== diff.value && /\n/.test(diff.value)){
					diff.value.split(/\n/g).forEach((value, index) => {
						if(index)
							changes.push({value: "\n"});
						const output = Object.assign({}, diff);
						output.value = value;
						changes.push(output);
					});
				}
				
				else changes.push(diff);
			})
		
		/** Show removals first */
		for(let c of changes){
			if(c.value === "\n") this.tokens.push(new LineBreak());
			else if(c.removed)   this.tokens.push(new Token(CHAR_REMOVAL, c.value, true));
			else if(!c.added)    this.tokens.push(new Token(REMOVAL, c.value, true));
		}
		
		this.nl();
		
		/** Then show additions */
		for(let c of changes){
			if(c.value === "\n") this.tokens.push(new LineBreak());
			else if(c.added)     this.tokens.push(new Token(CHAR_ADDITION, c.value, true));
			else if(!c.removed)  this.tokens.push(new Token(ADDITION, c.value, true));
		}
		
		this.nl(true);
	}
	
	
	/**
	 * Push a newline onto the token-list, unless the last token WAS a newline.
	 *
	 * @param {Boolean} resetStyle - Passed to LineBreak's constructor
	 * @private
	 */
	nl(resetStyle = false){
		const lastToken = this.tokens[this.tokens.length - 1];
		if(!(lastToken instanceof LineBreak))
			this.tokens.push(new LineBreak(resetStyle));
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
						
						const changes  = lines.slice(lastRemoval, lastAddition + 1);
						const midpoint = i - lastRemoval;
						output.splice(i, 0, new ChangeBlock(changes, midpoint));
						
						i = lastAddition;
						lastRemoval = null;
						removals    = [];
						continue;
					}
					
					else output.push(
						new Token(ADDITION, line),
						new LineBreak()
					);
					break;
				}
				
				/** Surrounding lines/context */
				case " ":{
					if(removals.length !== 0)
						resetRemovals(i);
					
					output.push(
						new Token(NORMAL, line),
						new LineBreak()
					);
					break;
				}
				
				
				/** Divider */
				case "@":{
					if(removals.length !== 0)
						resetRemovals(i);
					
					if(output.length)
						output.push(
							new Divider(),
							new LineBreak()
						);
					break;
				}
			}
		}

		/** Drop any collected removals into the returned array */
		function resetRemovals(from){
			const rm = [];
			for(let r of removals.map(n => new Token(REMOVAL, n)))
				rm.push(r, new LineBreak());
			output.splice(from, 0, ...rm);
			lastRemoval = null;
			removals    = [];
		}
		
		
		return output.map(i => i.toString()).join("");
	}
	
	
	prependIndicators(input){
		const addSrc = ("^(" + SGR_ADDED_CHAR   + "|" + SGR_ADDED_LINE   + ")").replace(/\[/g, "\\[");
		const rmSrc  = ("^(" + SGR_REMOVED_CHAR + "|" + SGR_REMOVED_LINE + ")").replace(/\[/g, "\\[");
		const nmlSrc = ("^(" + SGR_NORMAL_LINE  + "|" + SGR_RESET_LINE   + ")").replace(/\[/g, "\\[")
		
		return input
			.replace(new RegExp(addSrc, "gm"), `${SGR_ADDED_LINE}+$1`)
			.replace(new RegExp(rmSrc,  "gm"), `${SGR_REMOVED_LINE}-$1`)
			.replace(new RegExp(nmlSrc, "gm"), " $1")
	}
	
	
	/**
	 * Debugging method to help pinpoint errors with TTY output.
	 *
	 * @private
	 * @param {String} input
	 * @param {Boolean} inline
	 * @return {String} output
	 */
	showSGR(input, inline = false){
		let s = inline ? ["{", "}"] : ["\n", "\n"];
		return input
			.replace(/\x1B\[48;5;28;38;5;82m/g, s.join("SGR_ADDED_CHAR"))
			.replace(/\x1B\[38;5;2m/g, s.join("SGR_ADDED_LINE"))
			.replace(/\x1B\[38;5;8m/g, s.join("SGR_NORMAL_LINE"))
			.replace(/\x1B\[48;5;88;38;5;196m/g, s.join("SGR_REMOVED_CHAR"))
			.replace(/\x1B\[38;5;1m/g, s.join("SGR_REMOVED_LINE"))
			.replace(/\x1B\[49;39m/g, s.join("SGR_RESET_CHAR"))
			.replace(/\x1B\[0m/g, s.join("SGR_RESET_LINE"));
	}
}

module.exports = new PatchPainter;
