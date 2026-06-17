import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await auth();
  if (!session) {
    return { session: null as never, error: NextResponse.json({ error: "未授權" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { session: null as never, error: NextResponse.json({ error: "無權限" }, { status: 403 }) };
  }
  return { session, error: null };
}

export async function requireTeacherForClass(classId: string) {
  const session = await auth();
  if (!session) {
    return { session: null as never, error: NextResponse.json({ error: "未授權" }, { status: 401 }) };
  }
  if (session.user.role === "ADMIN") return { session, error: null };

  const link = await prisma.classTeacher.findUnique({
    where: { userId_classId: { userId: session.user.id, classId } },
  });
  if (!link) {
    return { session: null as never, error: NextResponse.json({ error: "無此課程的存取權限" }, { status: 403 }) };
  }
  return { session, error: null };
}
