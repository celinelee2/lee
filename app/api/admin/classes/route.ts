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

type ClassInput = {
  name: string; campus: string; subject: string;
  weekday: number; scheduleText: string; startDate: string; endDate: string;
};

function buildClassData(item: ClassInput) {
  return {
    name: item.name.trim(),
    campus: item.campus.trim(),
    subject: item.subject.trim(),
    weekday: Number(item.weekday),
    scheduleText: item.scheduleText.trim(),
    startDate: new Date(item.startDate),
    endDate: new Date(item.endDate),
  };
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();

  // batch: [{ name, campus, subject, weekday, scheduleText, startDate, endDate }]
  if (Array.isArray(body)) {
    if (body.length === 0) return NextResponse.json({ error: "名單不得為空" }, { status: 400 });
    const created = await prisma.$transaction(
      body.map((item: ClassInput) => prisma.class.create({ data: buildClassData(item) }))
    );
    return NextResponse.json({ count: created.length }, { status: 201 });
  }

  const { name, campus, subject, weekday, scheduleText, startDate, endDate } = body;
  if (!name?.trim() || !campus?.trim() || !subject?.trim() || weekday === undefined || !scheduleText?.trim() || !startDate || !endDate) {
    return NextResponse.json({ error: "所有欄位皆為必填" }, { status: 400 });
  }

  const cls = await prisma.class.create({
    data: buildClassData({ name, campus, subject, weekday, scheduleText, startDate, endDate }),
    include: {
      teachers: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { studentLinks: { where: { isActive: true } } } },
    },
  });
  return NextResponse.json(cls, { status: 201 });
}
