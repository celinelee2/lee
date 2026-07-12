import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacherForClass } from "@/lib/auth-helpers";

function countExpectedSessions(
  year: number, month: number, weekday: number,
  startDate: Date, endDate: Date
): number {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const from = startDate > monthStart ? startDate : monthStart;
  const to = endDate < monthEnd ? endDate : monthEnd;
  if (from > to) return 0;
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    if (d.getUTCDay() === weekday) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;
  const { error } = await requireTeacherForClass(classId);
  if (error) return error;

  const monthParam = req.nextUrl.searchParams.get("month"); // YYYY-MM
  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return NextResponse.json({ error: "找不到課程時段" }, { status: 404 });

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const sessions = await prisma.classSession.findMany({
    where: { classId, sessionDate: { gte: monthStart, lte: monthEnd } },
    include: { attendances: true },
  });

  const studentLinks = await prisma.classStudent.findMany({
    where: { classId, isActive: true },
    include: { student: { include: { enrollmentLabel: { select: { name: true } } } } },
    orderBy: [{ student: { enrollmentLabel: { name: "asc" } } }, { student: { nameZh: "asc" } }],
  });

  const expected = countExpectedSessions(year, month, cls.weekday, cls.startDate, cls.endDate);

  const students = studentLinks.map((link, idx) => {
    let present = 0, absent = 0;
    for (const s of sessions) {
      const att = s.attendances.find((a) => a.studentId === link.studentId);
      if (att?.status === "PRESENT") present++;
      else if (att?.status === "ABSENT") absent++;
    }
    return {
      id: link.student.id,
      seqNo: link.student.studentNumber ?? String(idx + 1),
      name: link.student.nameZh,
      enrollmentLabelName: link.student.enrollmentLabel.name,
      present,
      absent,
      expected,
    };
  });

  return NextResponse.json({
    class: { name: cls.name, campus: cls.campus, subject: cls.subject, scheduleText: cls.scheduleText },
    month: `${year}-${String(month).padStart(2, "0")}`,
    expectedSessions: expected,
    sessionCount: sessions.length,
    students,
  });
}
