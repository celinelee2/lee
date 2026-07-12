import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BatchRow = { studentNumber: string; nameZh: string; nameEn: string; notes: string; enrollmentLabelId: string };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: classGroupId } = await params;
    const rows: BatchRow[] = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "無資料" }, { status: 400 });

    const results: { nameZh: string; action: "created" | "enrolled" | "skipped" }[] = [];

    for (const row of rows) {
      if (!row.nameZh) continue;

      // find existing student by studentNumber (if provided) or nameZh
      let studentId: string | null = null;
      if (row.studentNumber) {
        const found = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Student" WHERE "studentNumber" = ${row.studentNumber} AND "isActive" = true LIMIT 1
        `;
        if (found.length) studentId = found[0].id;
      }
      if (!studentId) {
        const found = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Student" WHERE "nameZh" = ${row.nameZh} AND "isActive" = true LIMIT 1
        `;
        if (found.length) studentId = found[0].id;
      }

      // create student if not found
      let action: "created" | "enrolled" | "skipped" = "enrolled";
      if (!studentId) {
        studentId = `s${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
        await prisma.$executeRaw`
          INSERT INTO "Student" (id, "nameZh", "nameEn", "studentNumber", "isActive", "createdAt")
          VALUES (${studentId}, ${row.nameZh}, ${row.nameEn || null}, ${row.studentNumber || null}, true, NOW())
        `;
        action = "created";
      }

      // check if already enrolled
      const existing = await prisma.$queryRaw<{ id: string; isActive: boolean }[]>`
        SELECT id, "isActive" FROM "ClassGroupStudent"
        WHERE "classGroupId" = ${classGroupId} AND "studentId" = ${studentId} LIMIT 1
      `;

      if (existing.length) {
        if (Boolean(existing[0].isActive)) {
          results.push({ nameZh: row.nameZh, action: "skipped" });
          continue;
        }
        // re-activate
        await prisma.$executeRaw`
          UPDATE "ClassGroupStudent" SET "isActive" = true,
            "enrollmentLabelId" = ${row.enrollmentLabelId || null},
            notes = ${row.notes || null}
          WHERE id = ${existing[0].id}
        `;
      } else {
        const cgsId = `cgs${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
        await prisma.$executeRaw`
          INSERT INTO "ClassGroupStudent" (id, "classGroupId", "studentId", "enrollmentLabelId", notes, "isActive", "joinedAt")
          VALUES (${cgsId}, ${classGroupId}, ${studentId}, ${row.enrollmentLabelId || null}, ${row.notes || null}, true, NOW())
        `;
      }

      results.push({ nameZh: row.nameZh, action });
    }

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
