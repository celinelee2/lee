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

async function createOneUser(name: string, email: string) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error(`${email} 已被使用`);

  const unusable = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(unusable, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  const { url, skipped } = await sendWelcomeEmail(user.email, user.name, token);
  return { user, resetUrl: skipped ? url : null };
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();

  // batch: [{ name, email }]
  if (Array.isArray(body)) {
    if (body.length === 0) return NextResponse.json({ error: "名單不得為空" }, { status: 400 });
    const results = [];
    const errors = [];
    for (const item of body as { name: string; email: string }[]) {
      try {
        results.push(await createOneUser(item.name, item.email));
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    return NextResponse.json({ count: results.length, results, errors }, { status: 201 });
  }

  const { name, email } = body;
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "姓名與 Email 為必填" }, { status: 400 });
  }
  try {
    const result = await createOneUser(name, email);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
