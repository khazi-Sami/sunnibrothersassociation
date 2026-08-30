import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

function getSignupError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P1001") {
      const databaseHost = err.meta?.database_host;
      const host = typeof databaseHost === "string" ? ` at ${databaseHost}` : "";

      return {
        message: `Can't reach database server${host}. Please make sure your database server is running.`,
        status: 503,
      };
    }

    return { message: err.message, status: 500 };
  }

  if (err instanceof Error) {
    return { message: err.message, status: 500 };
  }

  return { message: "Signup failed", status: 500 };
}

export async function POST(req: Request) {
  try {
    const prisma = getPrisma();
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = (body.name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim().toLowerCase();
    const password = (body.password ?? "").toString();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already used" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { name: name || null, email, password: hash, role: "STUDENT" },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("SIGNUP_ERROR:", err);
    const { message, status } = getSignupError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
