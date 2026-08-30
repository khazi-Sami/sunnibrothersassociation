/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(require("node:path").join(__dirname, "..", "lib", "attendance.ts"), "utf8");
const moduleShim = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module: moduleShim, exports: moduleShim.exports });
const { attendancePercentage } = moduleShim.exports;

assert.equal(attendancePercentage([{ status: "PRESENT" }, { status: "LATE" }, { status: "ABSENT" }, { status: "EXCUSED" }, { status: "UNMARKED" }]), 67);
assert.equal(attendancePercentage([{ status: "PRESENT" }, { status: "PRESENT" }, { status: "EXCUSED" }]), 100);
assert.equal(attendancePercentage([{ status: "EXCUSED" }, { status: "UNMARKED" }]), 0);
console.log("attendance percentage tests passed");
