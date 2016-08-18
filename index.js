#!/usr/local/bin/node --es_staging
"use strict";

const PatchPainter = require("./patch-painter");

const fs = require("fs");

const result = PatchPainter.format(fs.readFileSync("sample.diff").toString());
console.log(result);
