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
const SGR_REMOVED_CHAR  = "\x1B[48;5;88;38;5;196m";
const SGR_REMOVED_LINE  = "\x1B[38;5;1m";
const SGR_NORMAL        = "\x1B[38;5;8m";
const SGR_RESET         = "\x1B[0m";


class PatchPainter{
	
	format(input){
		const fileDiffs = input
			.split(/^diff /g)
			.map(f => f.replace(/^[^\x00]+?\n(?=@@ )/g, "").split(/^(?=@@ )/gm).filter(i => i && i.length))
			.filter(i => i && i.length && (i.length !== 1 || i[0] !== ""))
		
		return fileDiffs.map(file => {
			return file.map(chunk => {
				let lines = [];
				
				/** Here's the ugly part */
				chunk = chunk
					.replace(
						/((?:(?:^|\n)-.*\n)+)((?:(?:^|\n)\+.*\n)+)/gm,
						
						(match, removals, additions, offset) => {
							const index = offset + match.length;
							const token = this.sideBySide(removals, additions);
							lines.push({ index, token });
							return match.replace(/^[-+]/gm, "*");
						})
					
					/** Removals */
					.replace(/^-.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = this.removal(match);
						lines.push({ index, token });
						return match.replace(/^-/gm, "*");
					})
					
					/** Additions/Insertions */
					.replace(/^\+.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = this.addition(match);
						lines.push({ index, token });
						return match.replace(/^\+/gm, "*");
					})
					
					/** Diff-chunk dividers */
					.replace(/^@@ .+?@@.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = "";
						lines.push({ index, token })
						return match.replace(/^@@ /, "** ");
					})
					
					/** Normal/context lines */
					.replace(/^\x20.*$/gm, (match, offset) => {
						const index = offset + match.length;
						const token = this.context(match);
						lines.push({ index, token });
						return match.replace(/^\x20/gm, "*");
					});
				
				
				/** And here's the part that's just plain dumb */
				lines = lines.sort((a, b) => {
					const A = a.index;
					const B = b.index;
					if(A < B) return -1
					if(A > B) return 1;
					return 0;
				}).map(l => l.token)
				
				return lines;
			});
			
		});
	}
	
	
	/**
	 * Highlight changes between contiguous change-sets.
	 *
	 * @private
	 * @param {Array} removals
	 * @param {Array} additions
	 * @return {String} output
	 */
	sideBySide(removals, additions){
		let output  = "";
		const strip = /^[-+ ]/gm;
		removals    = removals.replace(strip, "").replace(/^\n/, "");
		additions   = additions.replace(strip, "");
		
		const changes = diff.diffWordsWithSpace(removals, additions);
		
		for(let c of changes){
			if(c.removed)       output += SGR_REMOVED_CHAR + c.value + SGR_RESET;
			else if(!c.added)   output += SGR_REMOVED_LINE + c.value + SGR_RESET;
		}
		
		/** Always make sure there's a newline in-between */
		if(!/\n(?:\x1B\[[\d;]+m)?$/.test(output))
			output += "\n";
		
		for(let c of changes){
			if(c.added)         output += SGR_ADDED_CHAR + c.value + SGR_RESET;
			else if(!c.removed) output += SGR_ADDED_LINE + c.value + SGR_RESET;
		}
		
		return output
			.replace(/^((?:\x1B\[0m)?\x1B\[(?:38;5;1|48;5;88;38;5;196)m)/gm, SGR_RESET + SGR_REMOVED_LINE + "-$1")
			.replace(/^((?:\x1B\[0m)?\x1B\[(?:38;5;2|48;5;28;38;5;82)m)/gm,  SGR_RESET + SGR_ADDED_LINE   + "+$1")
	}
	
	
	/**
	 * Highlight a deletion in a diff.
	 *
	 * @private
	 * @param {String} line
	 * @return {String} output
	 */
	removal(line){
		line += "\n";
		return SGR_REMOVED_LINE + line + SGR_RESET;
	}
	
	
	/**
	 * Highlight an insertion in a diff.
	 *
	 * @private
	 * @param {String} line
	 * @return {String} output
	 */
	addition(line){
		line += "\n";
		return SGR_ADDED_LINE + line + SGR_RESET;
	}
	
	
	/**
	 * Highlight regular/surrounding text in a diff.
	 *
	 * @private
	 * @param {String} line
	 * @return {String} output
	 */
	context(line){
		line += "\n";
		return SGR_NORMAL + line + SGR_RESET;
	}
}

module.exports = new PatchPainter();
