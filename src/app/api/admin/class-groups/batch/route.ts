import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseCSV(raw: string): string[][] {
  const text = raw.replace(/^﻿/, "");
  const result: string[][] = [];
  let row: string[] = [], field = "", inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(field.trim()); field = ""; }
      else if (ch === '\r' && next === '\n') { i++; row.push(field.trim()); if (row.some(c => c)) result.push(row); row = []; field = ""; }
      else if (ch === '\n') { row.push(field.trim()); if (row.some(c => c)) result.push(row); row = []; field = ""; }
      else { field += ch; }
    }
  }
  if (field || row.length > 0) { row.push(field.trim()); if (row.some(c => c)) result.push(row); }
  return result;
}

const COL_MAP: Record<string, string> = {
  "學期名稱": "semesterName",
  "學校簡稱": "schoolName",
  "班級名稱": "className",
  "學校班別": "schoolClass",
  "科目名稱": "courseName",
  "星期": "weekday",
  "上課時間": "classTime",
  "授課老師": "teacherName",
  "助教一": "assistant1Name",
  "助教二": "assistant2Name",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "未提供檔案" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: "CSV 內容為空" }, { status: 400 });

  const headers = rows[0];
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = COL_MAP[h.trim()];
    if (key) colIndex[key] = i;
  });

  if (colIndex["className"] === undefined) {
    return NextResponse.json({ error: `找不到「班級名稱」欄位，請確認標題列正確（目前標題：${headers.join(", ")}）` }, { status: 400 });
  }

  const [semesters, schools, users, courseRows] = await Promise.all([
    prisma.semester.findMany({ select: { id: true, name: true } }),
    prisma.school.findMany({ select: { id: true, shortName: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.$queryRaw<{ id: string; name: string }[]>`SELECT id, name FROM "Subject" WHERE "isActive" = true`,
  ]);

  const semesterMap = Object.fromEntries(semesters.map(s => [s.name, s.id]));
  const schoolMap = Object.fromEntries(schools.map(s => [s.shortName, s.id]));
  const courseMap = Object.fromEntries(courseRows.map(c => [c.name, c.id]));
  const teacherMap = Object.fromEntries(users.map(u => [u.name, u.id]));

  function get(row: string[], key: string): string {
    const idx = colIndex[key];
    return idx !== undefined ? (row[idx] ?? "") : "";
  }

  const results = { success: 0, errors: [] as string[] };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const className = get(row, "className");
    if (!className) { results.errors.push(`第 ${i + 1} 行：班級名稱為必填`); continue; }

    const semesterName = get(row, "semesterName");
    const schoolName = get(row, "schoolName");
    const teacherName = get(row, "teacherName");
    const classTime = get(row, "classTime");

    if (!semesterName || !schoolName || !teacherName || !classTime) {
      results.errors.push(`第 ${i + 1} 行（${className}）：學期名稱、學校簡稱、授課老師、上課時間均為必填`);
      continue;
    }

    const semesterId = semesterMap[semesterName];
    if (!semesterId) { results.errors.push(`第 ${i + 1} 行（${className}）：找不到學期「${semesterName}」`); continue; }
    const schoolId = schoolMap[schoolName];
    if (!schoolId) { results.errors.push(`第 ${i + 1} 行（${className}）：找不到學校「${schoolName}」`); continue; }
    const teacherId = teacherMap[teacherName];
    if (!teacherId) { results.errors.push(`第 ${i + 1} 行（${className}）：找不到老師「${teacherName}」`); continue; }

    const schoolClass = get(row, "schoolClass");
    const weekdayStr = get(row, "weekday");
    const weekday = weekdayStr ? Number(weekdayStr) : 1;

    const courseNameVal = get(row, "courseName");
    const courseId = courseNameVal ? (courseMap[courseNameVal] ?? null) : null;
    if (courseNameVal && !courseId) {
      results.errors.push(`第 ${i + 1} 行（${className}）：找不到科目「${courseNameVal}」，請先建立科目`);
      continue;
    }

    const a1Name = get(row, "assistant1Name");
    const a2Name = get(row, "assistant2Name");
    const assistant1Id = a1Name ? (teacherMap[a1Name] ?? null) : null;
    const assistant2Id = a2Name ? (teacherMap[a2Name] ?? null) : null;
    if (a1Name && !assistant1Id) { results.errors.push(`第 ${i + 1} 行（${className}）：找不到助教一「${a1Name}」`); continue; }
    if (a2Name && !assistant2Id) { results.errors.push(`第 ${i + 1} 行（${className}）：找不到助教二「${a2Name}」`); continue; }

    try {
      const id = `cg${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
      await prisma.$executeRaw`
        INSERT INTO "ClassGroup" (id, "courseId", "semesterId", "schoolId", "className", "schoolClass",
          weekday, "classTime", "teacherId", "assistant1Id", "assistant2Id", "isActive", "createdAt")
        VALUES (
          ${id}, ${courseId || null}, ${semesterId}, ${schoolId}, ${className}, ${schoolClass || className},
          ${weekday}, ${classTime}, ${teacherId},
          ${assistant1Id || null}, ${assistant2Id || null},
          true, NOW()
        )
      `;
      results.success++;
    } catch {
      results.errors.push(`第 ${i + 1} 行（${className}）：新增失敗`);
    }
  }

  return NextResponse.json(results);
}
