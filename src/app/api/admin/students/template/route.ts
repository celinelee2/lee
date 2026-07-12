import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const header = "中文姓名,英文名,學號,生日(YYYY-MM-DD),性別(M/F),班別名稱,備註";
  const example = "王小明,Xiao Ming Wang,S001,2018-03-15,M,一般班,";
  const csv = "﻿" + header + "\n" + example;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students_template.csv"',
    },
  });
}
