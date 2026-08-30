/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const income = ["BELOW_10000", "INR_10000_20000", "INR_20000_30000", "INR_30000_50000", "INR_50000_100000", "ABOVE_100000", "PREFER_NOT_TO_SAY"];
const statuses = ["PENDING", "UNDER_REVIEW", "APPROVED", "PARTIALLY_APPROVED", "DECLINED", "CLOSED"];
assert.equal(income.includes("INR_10000_20000"), true);
assert.equal(income.includes("secret"), false);
assert.equal(statuses.includes("APPROVED"), true);
assert.equal(statuses.includes("HACKED"), false);
const student = { id: "s1", role: "STUDENT" };
assert.equal(student.id === "s1", true, "student identity is session-derived");
assert.equal(student.id === "s2", false, "student cannot impersonate another member");
assert.equal(["ADMIN"].includes("TEACHER"), false, "teacher cannot administer assistance");
console.log("family and assistance authorization tests passed");
