import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const setting = await prisma.orgSetting.findFirst();
  return NextResponse.json(setting ?? { orgName: "Artpresso國際教育中心" });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { orgName } = await req.json();
  if (!orgName?.trim()) {
    return NextResponse.json({ error: "機構名稱不得為空" }, { status: 400 });
  }

  const existing = await prisma.orgSetting.findFirst();
  const setting = existing
    ? await prisma.orgSetting.update({ where: { id: existing.id }, data: { orgName } })
    : await prisma.orgSetting.create({ data: { id: "default", orgName } });

  return NextResponse.json(setting);
}
