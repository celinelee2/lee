import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, email } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "姓名與 Email 為必填" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "此 Email 已被使用" }, { status: 400 });
  }

  const unusable = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(unusable, 12);

  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { url, skipped } = await sendWelcomeEmail(user.email, user.name, token);

  return NextResponse.json({ user, resetUrl: skipped ? url : null }, { status: 201 });
}
