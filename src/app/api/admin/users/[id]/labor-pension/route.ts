import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const rows = await prisma.$queryRaw<{
      id: string; legalEntityId: string; legalEntityName: string;
      isEnrolled: boolean; monthlySalary: string | null;
      companyContrib: string | null; personalContrib: string | null;
      enrollDate: Date | null; resignDate: Date | null; adjustDate: Date | null;
    }[]>`
      SELECT lp.id, lp."legalEntityId", le.name AS "legalEntityName",
        lp."isEnrolled", lp."monthlySalary"::text,
        lp."companyContrib"::text, lp."personalContrib"::text,
        lp."enrollDate", lp."resignDate", lp."adjustDate"
      FROM "LaborPension" lp
      JOIN "LegalEntity" le ON le.id = lp."legalEntityId"
      JOIN "EmployeeProfile" ep ON ep.id = lp."employeeProfileId"
      WHERE ep."userId" = ${id}
      ORDER BY lp."createdAt"
    `;

    return NextResponse.json(rows.map(r => ({
      ...r,
      isEnrolled: Boolean(r.isEnrolled),
      monthlySalary: r.monthlySalary != null ? Number(r.monthlySalary) : null,
      companyContrib: r.companyContrib != null ? Number(r.companyContrib) : null,
      personalContrib: r.personalContrib != null ? Number(r.personalContrib) : null,
      enrollDate: r.enrollDate ? r.enrollDate.toISOString().slice(0, 10) : null,
      resignDate: r.resignDate ? r.resignDate.toISOString().slice(0, 10) : null,
      adjustDate: r.adjustDate ? r.adjustDate.toISOString().slice(0, 10) : null,
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
    const b = await req.json();

    const epRows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "EmployeeProfile" WHERE "userId" = ${id}`;
    if (!epRows.length) return NextResponse.json({ error: "請先儲存基本資料" }, { status: 400 });

    const rid = `lp${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    await prisma.$executeRaw`
      INSERT INTO "LaborPension" (id, "employeeProfileId", "legalEntityId", "isEnrolled",
        "monthlySalary", "companyContrib", "personalContrib",
        "enrollDate", "resignDate", "adjustDate", "isActive", "createdAt", "updatedAt")
      VALUES (
        ${rid}, ${epRows[0].id}, ${b.legalEntityId}, ${b.isEnrolled ?? true},
        ${b.monthlySalary !== "" && b.monthlySalary != null ? Number(b.monthlySalary) : null},
        ${b.companyContrib !== "" && b.companyContrib != null ? Number(b.companyContrib) : null},
        ${b.personalContrib !== "" && b.personalContrib != null ? Number(b.personalContrib) : null},
        ${b.enrollDate ? new Date(b.enrollDate) : null},
        ${b.resignDate ? new Date(b.resignDate) : null},
        ${b.adjustDate ? new Date(b.adjustDate) : null},
        true, NOW(), NOW()
      )
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
    await params;
    const b = await req.json();
    await prisma.$executeRaw`
      UPDATE "LaborPension" SET
        "isEnrolled"    = ${b.isEnrolled ?? true},
        "monthlySalary" = ${b.monthlySalary !== "" && b.monthlySalary != null ? Number(b.monthlySalary) : null},
        "companyContrib"  = ${b.companyContrib !== "" && b.companyContrib != null ? Number(b.companyContrib) : null},
        "personalContrib" = ${b.personalContrib !== "" && b.personalContrib != null ? Number(b.personalContrib) : null},
        "enrollDate"    = ${b.enrollDate ? new Date(b.enrollDate) : null},
        "resignDate"    = ${b.resignDate ? new Date(b.resignDate) : null},
        "adjustDate"    = ${b.adjustDate ? new Date(b.adjustDate) : null},
        "updatedAt"     = NOW()
      WHERE id = ${b.id}
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
    await params;
    const { recordId } = await req.json();
    await prisma.$executeRaw`DELETE FROM "LaborPension" WHERE id = ${recordId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
