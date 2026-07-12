import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();

    await prisma.$executeRaw`
      UPDATE "Student" SET
        "nameZh"            = ${body.nameZh},
        "nameEn"            = ${body.nameEn || null},
        "studentNumber"     = ${body.studentNumber || null},
        "schoolClass"       = ${body.schoolClass || null},
        birthday            = ${body.birthday ? new Date(body.birthday) : null},
        gender              = ${body.gender || null},
        notes               = ${body.notes || null},
        "enrollmentLabelId" = ${body.enrollmentLabelId || null},
        "isActive"          = ${body.isActive ?? true}
      WHERE id = ${id}
    `;

    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
