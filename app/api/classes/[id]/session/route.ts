import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacherForClass } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;
  const { error } = await requireTeacherForClass(classId);
  if (error) return error;

  const dateParam = req.nextUrl.searchParams.get("date");
  const sessionDate = dateParam ? new Date(dateParam) : new Date();
  // Normalise to date-only (midnight UTC)
  sessionDate.setUTCHours(0, 0, 0, 0);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teachers: { include: { user: { select: { name: true } } } } },
  });
  if (!cls) return NextResponse.json({ error: "找不到課程時段" }, { status: 404 });

  const orgSetting = await prisma.orgSetting.findFirst();

  const session = await prisma.classSession.upsert({
    where: { classId_sessionDate: { classId, sessionDate } },
    update: {},
    create: { classId, sessionDate },
  });

  const studentLinks = await prisma.classStudent.findMany({
    where: { classId, isActive: true },
    include: { student: { include: { enrollmentLabel: { select: { name: true } } } } },
    orderBy: [{ student: { enrollmentLabel: { name: "asc" } } }, { student: { name: "asc" } }],
  });

  const attendances = await prisma.attendance.findMany({
    where: { sessionId: session.id },
  });
  const attMap = new Map(attendances.map((a) => [a.studentId, a.status]));

  const students = studentLinks.map((link, idx) => ({
    id: link.student.id,
    name: link.student.name,
    studentNumber: link.student.studentNumber,
    seqNo: idx + 1,
    enrollmentLabel: link.student.enrollmentLabel,
    status: attMap.get(link.studentId) ?? null,
  }));

  return NextResponse.json({
    session: { id: session.id, completedAt: session.completedAt },
    class: {
      id: cls.id,
      name: cls.name,
      campus: cls.campus,
      subject: cls.subject,
      weekday: cls.weekday,
      scheduleText: cls.scheduleText,
      startDate: cls.startDate,
      endDate: cls.endDate,
      teacherNames: cls.teachers.map((t) => t.user.name).join("、"),
    },
    orgName: orgSetting?.orgName ?? "Artpresso國際教育中心",
    students,
  });
}
