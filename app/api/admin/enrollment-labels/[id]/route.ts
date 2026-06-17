import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const label = await prisma.enrollmentLabel.update({ where: { id }, data });
  return NextResponse.json(label);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const count = await prisma.student.count({ where: { enrollmentLabelId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "此班別尚有學生，請先移轉學生班別後再刪除" },
      { status: 400 }
    );
  }

  await prisma.enrollmentLabel.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
