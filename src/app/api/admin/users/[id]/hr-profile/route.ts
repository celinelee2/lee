import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const [userRows, profileRows] = await Promise.all([
      prisma.$queryRaw<{ id: string; name: string; nickname: string | null; email: string; role: string; isActive: boolean }[]>`
        SELECT id, name, nickname, email, role, "isActive" FROM "User" WHERE id = ${id}
      `,
      prisma.$queryRaw<{
        id: string; employeeNo: string | null; idNumber: string | null;
        birthDate: Date | null; onboardDate: Date | null; resignDate: Date | null;
        contactPhone: string | null;
        permanentAddress: string | null; contactAddress: string | null;
        emergencyContact: string | null; emergencyRelation: string | null; emergencyPhone: string | null;
      }[]>`
        SELECT id, "employeeNo", "idNumber", "birthDate", "onboardDate", "resignDate",
          "contactPhone", "permanentAddress", "contactAddress",
          "emergencyContact", "emergencyRelation", "emergencyPhone"
        FROM "EmployeeProfile" WHERE "userId" = ${id}
      `,
    ]);

    if (!userRows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const profile = profileRows[0] ?? null;

    return NextResponse.json({
      ...userRows[0],
      isActive: Boolean(userRows[0].isActive),
      profile: profile ? {
        ...profile,
        birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
        onboardDate: profile.onboardDate ? profile.onboardDate.toISOString().slice(0, 10) : null,
        resignDate: profile.resignDate ? profile.resignDate.toISOString().slice(0, 10) : null,
      } : null,
    });
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

    // upsert EmployeeProfile
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "EmployeeProfile" WHERE "userId" = ${id}
    `;

    if (existing.length) {
      await prisma.$executeRaw`
        UPDATE "EmployeeProfile" SET
          "employeeNo"        = ${b.employeeNo || null},
          "idNumber"          = ${b.idNumber || null},
          "birthDate"         = ${b.birthDate ? new Date(b.birthDate) : null},
          "onboardDate"       = ${b.onboardDate ? new Date(b.onboardDate) : null},
          "resignDate"        = ${b.resignDate ? new Date(b.resignDate) : null},
          "contactPhone"      = ${b.contactPhone || null},
          "permanentAddress"  = ${b.permanentAddress || null},
          "contactAddress"    = ${b.contactAddress || null},
          "emergencyContact"  = ${b.emergencyContact || null},
          "emergencyRelation" = ${b.emergencyRelation || null},
          "emergencyPhone"    = ${b.emergencyPhone || null},
          "updatedAt"         = NOW()
        WHERE "userId" = ${id}
      `;
    } else {
      const pid = `ep${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      await prisma.$executeRaw`
        INSERT INTO "EmployeeProfile" (id, "userId", "employeeNo", "idNumber", "birthDate", "onboardDate", "resignDate",
          "contactPhone", "permanentAddress", "contactAddress",
          "emergencyContact", "emergencyRelation", "emergencyPhone",
          "specialIdentity", "createdAt", "updatedAt")
        VALUES (
          ${pid}, ${id},
          ${b.employeeNo || null}, ${b.idNumber || null},
          ${b.birthDate ? new Date(b.birthDate) : null},
          ${b.onboardDate ? new Date(b.onboardDate) : null},
          ${b.resignDate ? new Date(b.resignDate) : null},
          ${b.contactPhone || null}, ${b.permanentAddress || null}, ${b.contactAddress || null},
          ${b.emergencyContact || null}, ${b.emergencyRelation || null}, ${b.emergencyPhone || null},
          'NONE', NOW(), NOW()
        )
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
