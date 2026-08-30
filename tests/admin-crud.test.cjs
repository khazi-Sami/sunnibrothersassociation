/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const students = read("app/api/admin/students/route.ts");
assert.match(students, /getCurrentDatabaseUser/);
assert.match(students, /user\?\.role === "ADMIN"/);
assert.match(students, /bcrypt\.hash/);
assert.match(students, /role:"STUDENT"/);
assert.match(students, /classAttendances:true/);
assert.match(students, /assistanceRequests:true/);

const teachers = read("app/api/admin/teachers/[id]/route.ts");
assert.match(teachers, /role:"TEACHER"/);
assert.match(teachers, /status:"INACTIVE"/);
assert.match(teachers, /Historical records were preserved/);

const courses = read("app/api/education/courses/route.ts");
assert.match(courses, /existing\.teacherId!==user\.id/);
assert.match(courses, /Assigned user must be a teacher/);
assert.match(courses, /Preserve class history instead of deleting it/);

const classes = read("app/api/education/classes/[id]/route.ts");
assert.match(classes, /user\.role!=="ADMIN"/);
assert.match(classes, /status:"CANCELLED"/);

const enrollments = read("app/api/education/enrollments/route.ts");
assert.match(enrollments, /course\.teacherId !== user\.id/);
assert.match(enrollments, /studentId_courseId/);

const notifications = read("app/api/admin/notifications/route.ts");
assert.match(notifications, /user\?\.role\s*===\s*"ADMIN"/);
assert.match(notifications, /adminNotification\.delete/);

const assistance = read("app/api/assistance/route.ts");
assert.match(assistance, /user\.role\s*!==\s*"ADMIN"/);
assert.match(assistance, /approvedAmount/);

const families = read("app/api/admin/families/[id]/route.ts");
assert.match(families, /familyMember\.findFirst/);
assert.match(families, /familyId:id/);
assert.match(families, /Only empty families without assistance history/);

const salaries = read("app/api/admin/salaries/route.ts");
assert.match(salaries, /PAID/);
assert.match(salaries, /retained for financial audit/);

console.log("admin CRUD authorization and retention tests passed");
