import { NextRequest } from "next/server";
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

  const monthParam = req.nextUrl.searchParams.get("month");
  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return new Response("Not found", { status: 404 });

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const sessions = await prisma.classSession.findMany({
    where: { classId, sessionDate: { gte: monthStart, lte: monthEnd } },
    include: { attendances: true },
  });

  const studentLinks = await prisma.classStudent.findMany({
    where: { classId, isActive: true },
    include: { student: { include: { enrollmentLabel: { select: { name: true } } } } },
    orderBy: [{ student: { enrollmentLabel: { name: "asc" } } }, { student: { name: "asc" } }],
  });

  const expected = countExpectedSessions(year, month, cls.weekday, cls.startDate, cls.endDate);

  const rows = studentLinks.map((link, idx) => {
    let present = 0, absent = 0;
    for (const s of sessions) {
      const att = s.attendances.find((a) => a.studentId === link.studentId);
      if (att?.status === "PRESENT") present++;
      else if (att?.status === "ABSENT") absent++;
    }
    const seq = link.student.studentNumber ?? String(idx + 1);
    return `${seq},${link.student.name},${link.student.enrollmentLabel.name},${present},${absent},${expected}`;
  });

  const BOM = "﻿";
  const header = "序號/學號,學生姓名,班別,出席次數,請假次數,應上課次數";
  const csv = BOM + [header, ...rows].join("\r\n");
  const filename = `${cls.name}_${year}年${month}月.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
