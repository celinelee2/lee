import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const where =
    session.user.role === "ADMIN"
      ? { isActive: true }
      : { isActive: true, teachers: { some: { userId: session.user.id } } };

  const classes = await prisma.class.findMany({
    where,
    include: {
      teachers: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { studentLinks: { where: { isActive: true } } } },
    },
    orderBy: [{ weekday: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(classes);
}
