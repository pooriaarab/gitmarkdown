#!/usr/bin/env node
import { readFileSync } from "node:fs";
const path = "private-repo-3d96/packages/support/package.json";
JSON.parse(readFileSync(path, "utf8"));
console.log("ok", path);
