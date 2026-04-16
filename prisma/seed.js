/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Pass@123", 10);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@sba.local" },
    update: { name: "Teacher One", role: Role.TEACHER },
    create: {
      name: "Teacher One",
      email: "teacher@sba.local",
      password: passwordHash,
      role: Role.TEACHER,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@sba.local" },
    update: { name: "Student One", role: Role.STUDENT },
    create: {
      name: "Student One",
      email: "student@sba.local",
      password: passwordHash,
      role: Role.STUDENT,
    },
  });

  const course = await prisma.course.upsert({
    where: { id: "demo-live-course" },
    update: {
      title: "Fiqh Essentials",
      description: "Foundational live weekly class.",
      teacherId: teacher.id,
    },
    create: {
      id: "demo-live-course",
      title: "Fiqh Essentials",
      description: "Foundational live weekly class.",
      teacherId: teacher.id,
    },
  });

  await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      courseId: course.id,
    },
  });

  const startAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.class.upsert({
    where: { roomName: `seed-${course.id}-room` },
    update: {
      title: "Live Intro Session",
      description: "Demo class for Jitsi flow testing.",
      scheduledAt: startAt,
      durationMinutes: 60,
      status: "SCHEDULED",
      teacherId: teacher.id,
      courseId: course.id,
    },
    create: {
      title: "Live Intro Session",
      description: "Demo class for Jitsi flow testing.",
      roomName: `seed-${course.id}-room`,
      scheduledAt: startAt,
      durationMinutes: 60,
      status: "SCHEDULED",
      teacherId: teacher.id,
      courseId: course.id,
    },
  });

  console.log("Seed complete: teacher@sba.local / student@sba.local / password Pass@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
