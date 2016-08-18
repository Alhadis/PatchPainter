#!/usr/local/bin/node --es_staging
"use strict";

const PatchPainter = require("./patch-painter");
const fs = require("fs");
const file = fs.readFileSync("tests/sample.diff").toString();

if(process.argv.indexOf("-h") !== -1){
	let result = PatchPainter.html(file);
	console.log(result);
}

else console.log(PatchPainter.tty(file));
