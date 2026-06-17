import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacherForClass } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id: classId, sessionId } = await params;
  const { session: authSession, error } = await requireTeacherForClass(classId);
  if (error) return error;

  const { studentId, status } = await req.json();
  if (!studentId || !["PRESENT", "ABSENT"].includes(status)) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }

  const attendance = await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    update: { status, markedAt: new Date(), markedBy: authSession.user.id },
    create: { sessionId, studentId, status, markedBy: authSession.user.id },
  });

  return NextResponse.json(attendance);
}
