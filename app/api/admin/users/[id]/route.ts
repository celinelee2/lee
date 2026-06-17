import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.email !== undefined) data.email = body.email.trim().toLowerCase();
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const hasAttendance = await prisma.attendance.count({ where: { markedBy: id } });
  if (hasAttendance > 0) {
    return NextResponse.json(
      { error: "此帳號已有點名記錄，請改用「停用」而非刪除" },
      { status: 400 }
    );
  }

  await prisma.classTeacher.deleteMany({ where: { userId: id } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
