import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      teachers: { include: { user: { select: { id: true, name: true } } } },
      studentLinks: {
        where: { isActive: true },
        include: { student: { include: { enrollmentLabel: { select: { id: true, name: true } } } } },
        orderBy: { student: { nameZh: "asc" } },
      },
    },
  });
  if (!cls) return NextResponse.json({ error: "找不到課程時段" }, { status: 404 });
  return NextResponse.json(cls);
}

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
  if (body.campus !== undefined) data.campus = body.campus.trim();
  if (body.subject !== undefined) data.subject = body.subject.trim();
  if (body.weekday !== undefined) data.weekday = Number(body.weekday);
  if (body.scheduleText !== undefined) data.scheduleText = body.scheduleText.trim();
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const cls = await prisma.class.update({
    where: { id },
    data,
    include: {
      teachers: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { studentLinks: { where: { isActive: true } } } },
    },
  });
  return NextResponse.json(cls);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const hasSession = await prisma.classSession.count({ where: { classId: id } });
  if (hasSession > 0) {
    return NextResponse.json(
      { error: "此課程時段已有點名記錄，請改用「停用」而非刪除" },
      { status: 400 }
    );
  }

  await prisma.classTeacher.deleteMany({ where: { classId: id } });
  await prisma.classStudent.deleteMany({ where: { classId: id } });
  await prisma.class.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
