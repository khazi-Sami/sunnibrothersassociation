/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, ClassType, Role } = require("@prisma/client");
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
      description: "Foundational weekly live class covering basic Islamic jurisprudence.",
      teacherId: teacher.id,
    },
    create: {
      id: "demo-live-course",
      title: "Fiqh Essentials",
      description: "Foundational weekly live class covering basic Islamic jurisprudence.",
      teacherId: teacher.id,
    },
  });

  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    update: {},
    create: { studentId: student.id, courseId: course.id },
  });

  const startAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.class.upsert({
    where: { id: "demo-live-intro-session" },
    update: {
      title: "Live Intro Session",
      description: "Demo class for Google Meet flow testing.",
      classType: ClassType.GOOGLE_MEET,
      youtubeVideoId: null,
      googleMeetUrl: "https://meet.google.com/abc-defg-hij",
      scheduledAt: startAt,
      durationMinutes: 60,
      status: "SCHEDULED",
      teacherId: teacher.id,
      courseId: course.id,
    },
    create: {
      id: "demo-live-intro-session",
      title: "Live Intro Session",
      description: "Demo class for Google Meet flow testing.",
      classType: ClassType.GOOGLE_MEET,
      youtubeVideoId: null,
      googleMeetUrl: "https://meet.google.com/abc-defg-hij",
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
