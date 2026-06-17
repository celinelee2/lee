import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: classId } = await params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId 為必填" }, { status: 400 });

  const link = await prisma.classTeacher.upsert({
    where: { userId_classId: { userId, classId } },
    update: {},
    create: { userId, classId },
  });
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: classId } = await params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId 為必填" }, { status: 400 });

  await prisma.classTeacher.deleteMany({ where: { classId, userId } });
  return new NextResponse(null, { status: 204 });
}
