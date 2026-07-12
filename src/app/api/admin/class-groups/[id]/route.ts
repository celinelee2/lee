import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const rows = await prisma.$queryRaw<{
      id: string; className: string; schoolClass: string; weekday: number; classTime: string; isActive: boolean;
      startDate: Date | null; endDate: Date | null;
      semesterName: string | null; schoolShortName: string | null; courseName: string | null;
      teacherName: string; teacherNickname: string | null;
    }[]>`
      SELECT cg.id, cg."className", cg."schoolClass", cg.weekday, cg."classTime", cg."isActive",
        cg."startDate", cg."endDate",
        sem.name AS "semesterName", sc."shortName" AS "schoolShortName", subj.name AS "courseName",
        t.name AS "teacherName", t.nickname AS "teacherNickname"
      FROM "ClassGroup" cg
      LEFT JOIN "Semester" sem ON sem.id = cg."semesterId"
      LEFT JOIN "School" sc ON sc.id = cg."schoolId"
      LEFT JOIN "Subject" subj ON subj.id = cg."courseId"
      JOIN "User" t ON t.id = cg."teacherId"
      WHERE cg.id = ${id}
    `;

    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const r = rows[0];
    return NextResponse.json({
      ...r,
      isActive: Boolean(r.isActive),
      startDate: r.startDate ? r.startDate.toISOString().slice(0, 10) : null,
      endDate: r.endDate ? r.endDate.toISOString().slice(0, 10) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await prisma.$executeRaw`DELETE FROM "ClassGroup" WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    await prisma.$executeRaw`
      UPDATE "ClassGroup" SET
        "courseId"     = ${body.courseId || null},
        "semesterId"   = ${body.semesterId},
        "schoolId"     = ${body.schoolId},
        "className"    = ${body.className},
        weekday        = ${Number(body.weekday)},
        "classTime"    = ${body.classTime},
        "teacherId"    = ${body.teacherId},
        "assistant1Id" = ${body.assistant1Id || null},
        "assistant2Id" = ${body.assistant2Id || null},
        "isActive"     = ${body.isActive ?? true},
        "startDate"    = ${body.startDate ? new Date(body.startDate) : null},
        "endDate"      = ${body.endDate ? new Date(body.endDate) : null}
      WHERE id = ${id}
    `;
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
