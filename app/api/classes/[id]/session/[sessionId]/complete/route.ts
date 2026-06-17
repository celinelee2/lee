import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacherForClass } from "@/lib/auth-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id: classId, sessionId } = await params;
  const { error } = await requireTeacherForClass(classId);
  if (error) return error;

  const session = await prisma.classSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date() },
  });

  return NextResponse.json(session);
}
