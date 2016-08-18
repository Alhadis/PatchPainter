#!/usr/local/bin/node --es_staging
"use strict";

const PatchPainter = require("./patch-painter");

const fs = require("fs");

let result = PatchPainter.format(fs.readFileSync("sample.diff").toString());
result = PatchPainter.prependIndicators(result);
console.log(result);
