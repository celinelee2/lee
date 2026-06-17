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
  if (body.studentNumber !== undefined) data.studentNumber = body.studentNumber?.trim() || null;
  if (body.enrollmentLabelId !== undefined) data.enrollmentLabelId = body.enrollmentLabelId;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const student = await prisma.student.update({
    where: { id },
    data,
    include: { enrollmentLabel: { select: { id: true, name: true } } },
  });
  return NextResponse.json(student);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const hasAttendance = await prisma.attendance.count({ where: { studentId: id } });
  if (hasAttendance > 0) {
    return NextResponse.json(
      { error: "此學生已有點名記錄，請改用「停用」而非刪除" },
      { status: 400 }
    );
  }

  await prisma.classStudent.deleteMany({ where: { studentId: id } });
  await prisma.student.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
