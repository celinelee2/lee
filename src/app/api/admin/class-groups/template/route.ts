import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const header = "學期名稱,學校簡稱,班級名稱,學校班別,科目名稱,星期,上課時間,授課老師,助教一,助教二";
  const example = "113-2,健康國小,113下週三班,二年甲班,幼兒美學,3,16:00-17:00,小美,,";
  const csv = "﻿" + header + "\n" + example;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="class_groups_template.csv"',
    },
  });
}
