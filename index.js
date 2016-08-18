#!/usr/local/bin/node --es_staging
"use strict";

const PatchPainter = require("./patch-painter");
const fs = require("fs");
const file = fs.readFileSync("tests/ee29465.diff").toString();
const {argv} = process

if(argv.indexOf("-h") !== -1){
	let result = PatchPainter.html(file);
	console.log(result);
}

else{
	let result = PatchPainter.tty(file, true);
	if(argv.indexOf("-d") !== -1)
		console.log(PatchPainter.debugSGR(result));
	else
		console.log(result);
}
