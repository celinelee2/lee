import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const students = await prisma.student.findMany({
    include: { enrollmentLabel: { select: { id: true, name: true } } },
    orderBy: [{ enrollmentLabel: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();

  // batch import: [{ name, enrollmentLabelId, studentNumber? }]
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return NextResponse.json({ error: "名單不得為空" }, { status: 400 });
    }
    const created = await prisma.$transaction(
      body.map((s: { name: string; enrollmentLabelId: string; studentNumber?: string }) =>
        prisma.student.create({
          data: {
            name: s.name.trim(),
            enrollmentLabelId: s.enrollmentLabelId,
            studentNumber: s.studentNumber?.trim() || null,
          },
        })
      )
    );
    return NextResponse.json({ count: created.length }, { status: 201 });
  }

  const { name, enrollmentLabelId, studentNumber } = body;
  if (!name?.trim() || !enrollmentLabelId) {
    return NextResponse.json({ error: "姓名與班別為必填" }, { status: 400 });
  }

  const student = await prisma.student.create({
    data: {
      name: name.trim(),
      enrollmentLabelId,
      studentNumber: studentNumber?.trim() || null,
    },
    include: { enrollmentLabel: { select: { id: true, name: true } } },
  });
  return NextResponse.json(student, { status: 201 });
}
