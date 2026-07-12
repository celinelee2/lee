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
      isEnrolled: boolean; nonEnrollReason: string | null;
      insuranceSalary: string | null; companyPremium: string | null; personalPremium: string | null;
      enrollDate: Date | null; resignDate: Date | null; adjustDate: Date | null;
    }[]>`
      SELECT hi.id, hi."legalEntityId", le.name AS "legalEntityName",
        hi."isEnrolled", hi."nonEnrollReason",
        hi."insuranceSalary"::text, hi."companyPremium"::text, hi."personalPremium"::text,
        hi."enrollDate", hi."resignDate", hi."adjustDate"
      FROM "HealthInsurance" hi
      JOIN "LegalEntity" le ON le.id = hi."legalEntityId"
      JOIN "EmployeeProfile" ep ON ep.id = hi."employeeProfileId"
      WHERE ep."userId" = ${id}
      ORDER BY hi."createdAt"
    `;

    return NextResponse.json(rows.map(r => ({
      ...r,
      isEnrolled: Boolean(r.isEnrolled),
      insuranceSalary: r.insuranceSalary != null ? Number(r.insuranceSalary) : null,
      companyPremium: r.companyPremium != null ? Number(r.companyPremium) : null,
      personalPremium: r.personalPremium != null ? Number(r.personalPremium) : null,
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

    const rid = `hi${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    await prisma.$executeRaw`
      INSERT INTO "HealthInsurance" (id, "employeeProfileId", "legalEntityId", "isEnrolled", "nonEnrollReason",
        "insuranceSalary", "companyPremium", "personalPremium",
        "enrollDate", "resignDate", "adjustDate", "isActive", "createdAt", "updatedAt")
      VALUES (
        ${rid}, ${epRows[0].id}, ${b.legalEntityId}, ${b.isEnrolled ?? true}, ${b.nonEnrollReason || null},
        ${b.insuranceSalary !== "" && b.insuranceSalary != null ? Number(b.insuranceSalary) : null},
        ${b.companyPremium !== "" && b.companyPremium != null ? Number(b.companyPremium) : null},
        ${b.personalPremium !== "" && b.personalPremium != null ? Number(b.personalPremium) : null},
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
      UPDATE "HealthInsurance" SET
        "isEnrolled"      = ${b.isEnrolled ?? true},
        "nonEnrollReason" = ${b.nonEnrollReason || null},
        "insuranceSalary" = ${b.insuranceSalary !== "" && b.insuranceSalary != null ? Number(b.insuranceSalary) : null},
        "companyPremium"  = ${b.companyPremium !== "" && b.companyPremium != null ? Number(b.companyPremium) : null},
        "personalPremium" = ${b.personalPremium !== "" && b.personalPremium != null ? Number(b.personalPremium) : null},
        "enrollDate"      = ${b.enrollDate ? new Date(b.enrollDate) : null},
        "resignDate"      = ${b.resignDate ? new Date(b.resignDate) : null},
        "adjustDate"      = ${b.adjustDate ? new Date(b.adjustDate) : null},
        "updatedAt"       = NOW()
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
    await prisma.$executeRaw`DELETE FROM "HealthInsurance" WHERE id = ${recordId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
