import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const classes = await prisma.class.findMany({
    include: {
      teachers: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { studentLinks: { where: { isActive: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(classes);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, campus, subject, weekday, scheduleText, startDate, endDate } = await req.json();
  if (!name?.trim() || !campus?.trim() || !subject?.trim() || weekday === undefined || !scheduleText?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: "所有欄位皆為必填" }, { status: 400 });
  }

  const cls = await prisma.class.create({
    data: {
      name: name.trim(),
      campus: campus.trim(),
      subject: subject.trim(),
      weekday: Number(weekday),
      scheduleText: scheduleText.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    include: {
      teachers: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { studentLinks: { where: { isActive: true } } } },
    },
  });
  return NextResponse.json(cls, { status: 201 });
}
