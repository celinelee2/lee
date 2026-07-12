import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rows = await prisma.$queryRaw<{
      id: string; className: string; schoolClass: string; subject: string | null;
      weekday: number; classTime: string; isActive: boolean;
      courseId: string | null; semesterId: string; schoolId: string;
      teacherId: string; assistant1Id: string | null; assistant2Id: string | null;
      semesterName: string | null;
      schoolShortName: string | null;
      courseName: string | null;
      teacherName: string; teacherNickname: string | null;
      assistant1Name: string | null; assistant1Nickname: string | null;
      assistant2Name: string | null; assistant2Nickname: string | null;
      studentCount: bigint;
    }[]>`
      SELECT
        cg.id, cg."className", cg."schoolClass", cg.subject,
        cg.weekday, cg."classTime", cg."isActive",
        cg."courseId", cg."semesterId", cg."schoolId",
        cg."teacherId", cg."assistant1Id", cg."assistant2Id",
        sem.name AS "semesterName",
        sc."shortName" AS "schoolShortName",
        subj.name AS "courseName",
        t.name AS "teacherName", t.nickname AS "teacherNickname",
        a1.name AS "assistant1Name", a1.nickname AS "assistant1Nickname",
        a2.name AS "assistant2Name", a2.nickname AS "assistant2Nickname",
        COUNT(cgs.id) AS "studentCount"
      FROM "ClassGroup" cg
      LEFT JOIN "Semester" sem ON sem.id = cg."semesterId"
      LEFT JOIN "School" sc ON sc.id = cg."schoolId"
      LEFT JOIN "Subject" subj ON subj.id = cg."courseId"
      JOIN "User" t ON t.id = cg."teacherId"
      LEFT JOIN "User" a1 ON a1.id = cg."assistant1Id"
      LEFT JOIN "User" a2 ON a2.id = cg."assistant2Id"
      LEFT JOIN "ClassGroupStudent" cgs ON cgs."classGroupId" = cg.id
      GROUP BY cg.id, sem.name, sc."shortName", subj.name,
               t.name, t.nickname, a1.name, a1.nickname, a2.name, a2.nickname
      ORDER BY cg."createdAt" DESC
    `;

    const groups = rows.map(r => ({
      id: r.id,
      className: r.className,
      schoolClass: r.schoolClass,
      subject: r.subject,
      weekday: r.weekday,
      classTime: r.classTime,
      isActive: Boolean(r.isActive),
      courseId: r.courseId,
      semesterId: r.semesterId,
      schoolId: r.schoolId,
      teacherId: r.teacherId,
      assistant1Id: r.assistant1Id,
      assistant2Id: r.assistant2Id,
      semester: r.semesterName ? { name: r.semesterName } : null,
      school: r.schoolShortName ? { shortName: r.schoolShortName } : null,
      course: r.courseName ? { name: r.courseName } : null,
      teacher: { name: r.teacherName, nickname: r.teacherNickname },
      assistant1: r.assistant1Name ? { name: r.assistant1Name, nickname: r.assistant1Nickname } : null,
      assistant2: r.assistant2Name ? { name: r.assistant2Name, nickname: r.assistant2Nickname } : null,
      _count: { students: Number(r.studentCount) },
    }));

    return NextResponse.json(groups);
  } catch (e) {
    console.error("class-groups GET error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { courseId, semesterId, schoolId, className, weekday, classTime, teacherId, assistant1Id, assistant2Id } = body;
    if (!semesterId || !schoolId || !className || weekday === undefined || !classTime || !teacherId) {
      return NextResponse.json({ error: "必填欄位缺漏" }, { status: 400 });
    }

    const id = `cg${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    await prisma.$executeRaw`
      INSERT INTO "ClassGroup" (id, "courseId", "semesterId", "schoolId", "className", "schoolClass",
        weekday, "classTime", "teacherId", "assistant1Id", "assistant2Id", "isActive", "createdAt")
      VALUES (
        ${id}, ${courseId || null}, ${semesterId}, ${schoolId}, ${className}, ${className},
        ${Number(weekday)}, ${classTime}, ${teacherId},
        ${assistant1Id || null}, ${assistant2Id || null},
        true, NOW()
      )
    `;

    return NextResponse.json({ id, className });
  } catch (e) {
    console.error("class-groups POST error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
