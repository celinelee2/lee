import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const rows = await prisma.$queryRaw<{
      id: string; studentId: string; notes: string | null; isActive: boolean;
      enrollmentLabelId: string | null; enrollmentLabelName: string | null;
      nameZh: string; nameEn: string | null; studentNumber: string | null;
      schoolClass: string | null; birthday: Date | null; gender: string | null;
    }[]>`
      SELECT cgs.id, cgs."studentId", cgs.notes, cgs."isActive",
        cgs."enrollmentLabelId", el.name AS "enrollmentLabelName",
        s."nameZh", s."nameEn", s."studentNumber", s."schoolClass", s.birthday, s.gender
      FROM "ClassGroupStudent" cgs
      JOIN "Student" s ON s.id = cgs."studentId"
      LEFT JOIN "EnrollmentLabel" el ON el.id = cgs."enrollmentLabelId"
      WHERE cgs."classGroupId" = ${id} AND cgs."isActive" = true
      ORDER BY s."nameZh"
    `;

    return NextResponse.json(rows.map(r => ({
      ...r,
      isActive: Boolean(r.isActive),
      birthday: r.birthday ? r.birthday.toISOString() : null,
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
    const { studentId, notes, enrollmentLabelId } = await req.json();
    if (!studentId) return NextResponse.json({ error: "studentId 為必填" }, { status: 400 });

    const linkId = `cgs${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    await prisma.$executeRaw`
      INSERT INTO "ClassGroupStudent" (id, "classGroupId", "studentId", "enrollmentLabelId", notes, "isActive", "createdAt")
      VALUES (${linkId}, ${id}, ${studentId}, ${enrollmentLabelId || null}, ${notes || null}, true, NOW())
      ON CONFLICT ("classGroupId", "studentId") DO UPDATE
        SET "isActive" = true,
            "enrollmentLabelId" = EXCLUDED."enrollmentLabelId",
            notes = EXCLUDED.notes
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const { studentId, notes, enrollmentLabelId } = await req.json();

    await prisma.$executeRaw`
      UPDATE "ClassGroupStudent"
      SET "enrollmentLabelId" = ${enrollmentLabelId || null},
          notes = ${notes || null}
      WHERE "classGroupId" = ${id} AND "studentId" = ${studentId}
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
    const { studentId } = await req.json();

    await prisma.$executeRaw`
      UPDATE "ClassGroupStudent" SET "isActive" = false
      WHERE "classGroupId" = ${id} AND "studentId" = ${studentId}
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
