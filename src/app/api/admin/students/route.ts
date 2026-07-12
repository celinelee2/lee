import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [studentRows, membershipRows] = await Promise.all([
      prisma.$queryRaw<{
        id: string; nameZh: string; nameEn: string | null; studentNumber: string | null;
        birthday: Date | null; gender: string | null; notes: string | null; isActive: boolean;
        enrollmentLabelId: string | null; enrollmentLabelName: string | null;
      }[]>`
        SELECT s.id, s."nameZh", s."nameEn", s."studentNumber", s."schoolClass", s.birthday,
          s.gender, s.notes, s."isActive", s."enrollmentLabelId", el.name AS "enrollmentLabelName"
        FROM "Student" s
        LEFT JOIN "EnrollmentLabel" el ON el.id = s."enrollmentLabelId"
        ORDER BY s."nameZh"
      `,
      prisma.$queryRaw<{ studentId: string; classGroupId: string; className: string }[]>`
        SELECT cgs."studentId", cg.id AS "classGroupId", cg."className"
        FROM "ClassGroupStudent" cgs
        JOIN "ClassGroup" cg ON cg.id = cgs."classGroupId"
        WHERE cgs."isActive" = true
        ORDER BY cg."className"
      `,
    ]);

    const membershipMap: Record<string, { id: string; className: string }[]> = {};
    for (const m of membershipRows) {
      if (!membershipMap[m.studentId]) membershipMap[m.studentId] = [];
      membershipMap[m.studentId].push({ id: m.classGroupId, className: m.className });
    }

    return NextResponse.json(studentRows.map(s => ({
      ...s,
      isActive: Boolean(s.isActive),
      birthday: s.birthday ? s.birthday.toISOString() : null,
      enrollmentLabel: s.enrollmentLabelName ? { name: s.enrollmentLabelName } : null,
      classGroups: membershipMap[s.id] ?? [],
    })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { nameZh, nameEn, studentNumber, schoolClass, birthday, gender, notes, enrollmentLabelId } = await req.json();
    if (!nameZh) return NextResponse.json({ error: "學生姓名為必填" }, { status: 400 });

    const id = `s${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    await prisma.$executeRaw`
      INSERT INTO "Student" (id, "nameZh", "nameEn", "studentNumber", "schoolClass", birthday, gender, notes, "enrollmentLabelId", "isActive", "createdAt")
      VALUES (
        ${id}, ${nameZh}, ${nameEn || null}, ${studentNumber || null}, ${schoolClass || null},
        ${birthday ? new Date(birthday) : null},
        ${gender || null}, ${notes || null}, ${enrollmentLabelId || null},
        true, NOW()
      )
    `;

    return NextResponse.json({ id, nameZh });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
