import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const labels = await prisma.enrollmentLabel.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { students: true } } },
  });
  return NextResponse.json(labels);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "班別名稱不得為空" }, { status: 400 });
  }

  const label = await prisma.enrollmentLabel.create({ data: { name: name.trim() } });
  return NextResponse.json(label, { status: 201 });
}
