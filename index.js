#!/usr/local/bin/node --es_staging
"use strict";

const PatchPainter = require("./patch-painter");

const fs = require("fs");

let result = PatchPainter.format(fs.readFileSync("sample.diff").toString());
result = PatchPainter.prependIndicators(result);

if(process.argv.indexOf("-l") !== -1)
	console.log(PatchPainter.showSGR(result));

else
	console.log(result);
