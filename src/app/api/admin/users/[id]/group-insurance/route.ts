import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const rows = await prisma.$queryRaw<{ id: string; isEnrolled: boolean; reason: string | null }[]>`
      SELECT gi.id, gi."isEnrolled", gi.reason
      FROM "GroupInsurance" gi
      JOIN "EmployeeProfile" ep ON ep.id = gi."employeeProfileId"
      WHERE ep."userId" = ${id}
    `;

    return NextResponse.json(rows[0] ? { ...rows[0], isEnrolled: Boolean(rows[0].isEnrolled) } : null);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const b = await req.json();

    const epRows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "EmployeeProfile" WHERE "userId" = ${id}`;
    if (!epRows.length) return NextResponse.json({ error: "請先儲存基本資料" }, { status: 400 });
    const epId = epRows[0].id;

    const existing = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "GroupInsurance" WHERE "employeeProfileId" = ${epId}`;
    if (existing.length) {
      await prisma.$executeRaw`
        UPDATE "GroupInsurance" SET "isEnrolled" = ${b.isEnrolled ?? true}, reason = ${b.reason || null}, "updatedAt" = NOW()
        WHERE "employeeProfileId" = ${epId}
      `;
    } else {
      const rid = `gi${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      await prisma.$executeRaw`
        INSERT INTO "GroupInsurance" (id, "employeeProfileId", "isEnrolled", reason, "createdAt", "updatedAt")
        VALUES (${rid}, ${epId}, ${b.isEnrolled ?? true}, ${b.reason || null}, NOW(), NOW())
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
