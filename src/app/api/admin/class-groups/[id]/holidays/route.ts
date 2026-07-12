import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const rows = await prisma.$queryRaw<{ id: string; holidayDate: Date; reason: string | null }[]>`
      SELECT id, "holidayDate", reason
      FROM "ClassHoliday"
      WHERE "classGroupId" = ${id}
      ORDER BY "holidayDate"
    `;

    return NextResponse.json(rows.map(r => ({
      ...r,
      holidayDate: r.holidayDate.toISOString().slice(0, 10),
    })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const { holidayDate, reason } = await req.json();
    if (!holidayDate) return NextResponse.json({ error: "日期為必填" }, { status: 400 });

    const hid = `ch${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    await prisma.$executeRaw`
      INSERT INTO "ClassHoliday" (id, "classGroupId", "holidayDate", reason, "createdAt")
      VALUES (${hid}, ${id}, ${new Date(holidayDate)}, ${reason || null}, NOW())
      ON CONFLICT ("classGroupId", "holidayDate") DO UPDATE SET reason = EXCLUDED.reason
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const { holidayDate } = await req.json();

    await prisma.$executeRaw`
      DELETE FROM "ClassHoliday"
      WHERE "classGroupId" = ${id} AND "holidayDate" = ${new Date(holidayDate)}
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
