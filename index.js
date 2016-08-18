#!/usr/local/bin/node --es_staging
"use strict";

const PatchPainter = require("./patch-painter");
const fs = require("fs");
const file = fs.readFileSync("tests/sample.diff").toString();

let result = PatchPainter.tty(file);
