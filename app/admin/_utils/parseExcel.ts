"use client";
import * as XLSX from "xlsx";

export async function parseFileToRows(file: File): Promise<string[][]> {
  if (file.name.endsWith(".csv")) {
    const text = await file.text();
    return text
      .trim()
      .split("\n")
      .map((row) => row.split(",").map((c) => c.trim()));
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false });
  return rows.map((row) =>
    (row as unknown[]).map((cell) => (cell == null ? "" : String(cell).trim()))
  );
}

export function dropHeaderRow(rows: string[][], firstCellKeyword: string): string[][] {
  if (rows[0]?.[0]?.includes(firstCellKeyword)) return rows.slice(1);
  return rows;
}

export const WEEKDAY_MAP: Record<string, number> = {
  週日: 0, 星期日: 0, "0": 0, 日: 0,
  週一: 1, 星期一: 1, "1": 1, 一: 1,
  週二: 2, 星期二: 2, "2": 2, 二: 2,
  週三: 3, 星期三: 3, "3": 3, 三: 3,
  週四: 4, 星期四: 4, "4": 4, 四: 4,
  週五: 5, 星期五: 5, "5": 5, 五: 5,
  週六: 6, 星期六: 6, "6": 6, 六: 6,
};
