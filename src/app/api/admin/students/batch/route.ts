import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim());
  return lines.map(line => {
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "未提供檔案" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text.replace(/^﻿/, ""));
  if (rows.length < 2) return NextResponse.json({ error: "CSV 內容為空" }, { status: 400 });

  const labels = await prisma.enrollmentLabel.findMany({ select: { id: true, name: true } });
  const labelMap = Object.fromEntries(labels.map(l => [l.name, l.id]));

  const results = { success: 0, errors: [] as string[] };

  for (let i = 1; i < rows.length; i++) {
    const [nameZh, nameEn, studentNumber, , , labelName] = rows[i];
    if (!nameZh) { results.errors.push(`第 ${i + 1} 行：中文姓名為必填`); continue; }
    const enrollmentLabelId = labelName ? (labelMap[labelName] ?? null) : null;
    if (!enrollmentLabelId) {
      results.errors.push(`第 ${i + 1} 行（${nameZh}）：找不到班別「${labelName}」，請先建立`);
      continue;
    }
    try {
      await prisma.student.create({
        data: {
          nameZh, nameEn: nameEn || null, studentNumber: studentNumber || null,
          enrollmentLabelId,
        },
      });
      results.success++;
    } catch {
      results.errors.push(`第 ${i + 1} 行（${nameZh}）：新增失敗`);
    }
  }

  return NextResponse.json(results);
}
