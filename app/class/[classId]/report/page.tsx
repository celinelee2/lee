"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type StudentRow = {
  id: string; seqNo: string; name: string;
  enrollmentLabelName: string; present: number; absent: number; expected: number;
};

type ReportData = {
  class: { name: string; campus: string; subject: string; scheduleText: string };
  month: string;
  expectedSessions: number;
  sessionCount: number;
  students: StudentRow[];
};

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${y}年${Number(mo)}月`;
}

export default function ReportPage() {
  const { classId } = useParams<{ classId: string }>();
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/classes/${classId}/report?month=${month}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [classId, month]);

  function handleExport() {
    window.location.href = `/api/classes/${classId}/report/export?month=${month}`;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      {data && (
        <div className="bg-white border-b" style={{ borderColor: "var(--card-border)" }}>
          <div className="max-w-2xl mx-auto px-4 py-3 text-center">
            <p className="text-sm font-bold" style={{ color: "var(--text-dark)" }}>{data.class.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--unmarked)" }}>
              {data.class.campus}・{data.class.subject}・{data.class.scheduleText}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/class/${classId}`} className="text-sm" style={{ color: "var(--accent)" }}>
            ← 返回點名
          </Link>
          <Link href="/dashboard" className="text-sm" style={{ color: "var(--unmarked)" }}>
            課程列表
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--text-dark)" }}>
            月出缺席報表
          </h1>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm outline-none"
            style={{ borderColor: "var(--card-border)" }}
          />
        </div>

        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--unmarked)" }}>載入中…</p>
        ) : data && (
          <>
            <div className="flex gap-3 mb-3 text-xs" style={{ color: "var(--unmarked)" }}>
              <span>{fmtMonth(month)}</span>
              <span>應上課 {data.expectedSessions} 次</span>
              <span>已點名 {data.sessionCount} 堂</span>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--card-border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--unmarked)" }}>
                    <th className="px-3 py-2.5 font-medium w-10">#</th>
                    <th className="px-3 py-2.5 font-medium">姓名</th>
                    <th className="px-3 py-2.5 font-medium">班別</th>
                    <th className="px-3 py-2.5 font-medium text-center">出席</th>
                    <th className="px-3 py-2.5 font-medium text-center">請假</th>
                    <th className="px-3 py-2.5 font-medium text-center">應到</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                      <td className="px-3 py-3 text-xs" style={{ color: "var(--unmarked)" }}>{s.seqNo}</td>
                      <td className="px-3 py-3 font-medium" style={{ color: "var(--text-dark)" }}>{s.name}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: "var(--unmarked)" }}>{s.enrollmentLabelName}</td>
                      <td className="px-3 py-3 text-center font-medium" style={{ color: "var(--present)" }}>{s.present}</td>
                      <td className="px-3 py-3 text-center font-medium" style={{ color: "var(--absent)" }}>{s.absent}</td>
                      <td className="px-3 py-3 text-center" style={{ color: "var(--unmarked)" }}>{s.expected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleExport}
              className="w-full py-3 rounded-xl border font-medium text-sm"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              匯出 CSV（Excel 可開啟）
            </button>
          </>
        )}
      </div>
    </div>
  );
}
