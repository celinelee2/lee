import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await prisma.$queryRaw<{
      id: string; name: string; nickname: string | null; email: string;
      role: string; isActive: boolean; createdAt: Date;
      legalEntityId: string | null; legalEntityName: string | null;
      employeeNo: string | null; onboardDate: Date | null; resignDate: Date | null;
    }[]>`
      SELECT u.id, u.name, u.nickname, u.email, u.role, u."isActive", u."createdAt",
        le.id AS "legalEntityId", le.name AS "legalEntityName",
        ep."employeeNo", ep."onboardDate", ep."resignDate"
      FROM "User" u
      LEFT JOIN "LegalEntity" le ON le.id = u."legalEntityId"
      LEFT JOIN "EmployeeProfile" ep ON ep."userId" = u.id
      ORDER BY u."createdAt" DESC
    `;

    return NextResponse.json(rows.map(r => ({
      id: r.id, name: r.name, nickname: r.nickname, email: r.email,
      role: r.role, isActive: Boolean(r.isActive), createdAt: r.createdAt,
      legalEntity: r.legalEntityId ? { id: r.legalEntityId, name: r.legalEntityName } : null,
      employeeProfile: {
        employeeNo: r.employeeNo,
        onboardDate: r.onboardDate ? r.onboardDate.toISOString().slice(0, 10) : null,
        resignDate: r.resignDate ? r.resignDate.toISOString().slice(0, 10) : null,
      },
    })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, role, legalEntityId } = await req.json();

  if (!name || !email || !role) {
    return NextResponse.json({ error: "必填欄位缺漏" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "此 Email 已存在" }, { status: 409 });
  }

  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash,
      legalEntityId: legalEntityId || null,
    },
  });

  return NextResponse.json({ id: user.id, tempPassword });
}
