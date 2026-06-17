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
  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId 為必填" }, { status: 400 });

  const link = await prisma.classStudent.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: { isActive: true },
    create: { classId, studentId },
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
  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId 為必填" }, { status: 400 });

  await prisma.classStudent.updateMany({
    where: { classId, studentId },
    data: { isActive: false },
  });
  return new NextResponse(null, { status: 204 });
}
