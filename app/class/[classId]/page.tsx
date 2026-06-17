"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Student = {
  id: string;
  name: string;
  studentNumber: string | null;
  seqNo: number;
  enrollmentLabel: { name: string };
  status: "PRESENT" | "ABSENT" | null;
};

type SessionData = {
  session: { id: string; completedAt: string | null };
  class: {
    id: string; name: string; campus: string; subject: string;
    scheduleText: string; startDate: string; endDate: string; teacherNames: string;
  };
  orgName: string;
  students: Student[];
};

const WEEKDAYS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();

  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<SessionData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const fetchSession = useCallback(async (d: string) => {
    setLoading(true);
    const r = await fetch(`/api/classes/${classId}/session?date=${d}`);
    const json: SessionData = await r.json();
    setData(json);
    setStudents(json.students);
    setLoading(false);
  }, [classId]);

  useEffect(() => { fetchSession(date); }, [date, fetchSession]);

  async function markAttendance(student: Student, status: "PRESENT" | "ABSENT") {
    if (!data) return;
    const newStatus = student.status === status ? null : status;

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => s.id === student.id ? { ...s, status: newStatus } : s)
    );

    if (newStatus === null) {
      // No "unmark" API for now — re-fetch to get truth from server
      // This is a rare case; just refetch
      fetchSession(date);
      return;
    }

    await fetch(`/api/classes/${classId}/session/${data.session.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, status: newStatus }),
    });
  }

  async function handleComplete() {
    if (!data) return;
    setCompleting(true);
    await fetch(`/api/classes/${classId}/session/${data.session.id}/complete`, {
      method: "POST",
    });
    setCompleting(false);
    fetchSession(date);
  }

  const completed = !!data?.session.completedAt;
  const presentCount = students.filter((s) => s.status === "PRESENT").length;
  const absentCount = students.filter((s) => s.status === "ABSENT").length;
  const unmarkedCount = students.filter((s) => s.status === null).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10" style={{ borderColor: "var(--card-border)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          {data && (
            <>
              <p className="text-xs font-bold text-center" style={{ color: "var(--accent)" }}>
                {data.orgName}
              </p>
              <p className="text-xs text-center mt-0.5" style={{ color: "var(--unmarked)" }}>
                {data.class.campus}・{data.class.subject}・{data.class.teacherNames}
              </p>
              <p className="text-xs text-center" style={{ color: "var(--unmarked)" }}>
                {data.class.scheduleText}・{fmtDate(data.class.startDate)} ~ {fmtDate(data.class.endDate)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="text-sm"
            style={{ color: "var(--accent)" }}
          >
            ← 返回
          </button>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ borderColor: "var(--card-border)" }}
            />
          </div>
          {completed && (
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: "#DCEFD3", color: "var(--present)" }}>
              已完成
            </span>
          )}
        </div>

        {/* Stats bar */}
        {!loading && (
          <div className="flex gap-3 mb-4 text-sm">
            <span style={{ color: "var(--present)" }}>出席 {presentCount}</span>
            <span style={{ color: "var(--absent)" }}>請假 {absentCount}</span>
            <span style={{ color: "var(--unmarked)" }}>未點 {unmarkedCount}</span>
          </div>
        )}

        {/* Student list */}
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--unmarked)" }}>載入中…</p>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--card-border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--unmarked)" }}>
                  <th className="px-3 py-2.5 font-medium w-10">#</th>
                  <th className="px-3 py-2.5 font-medium">姓名</th>
                  <th className="px-3 py-2.5 font-medium">班別</th>
                  <th className="px-3 py-2.5 font-medium text-right">出席 / 請假</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                    <td className="px-3 py-3 text-xs" style={{ color: "var(--unmarked)" }}>
                      {s.studentNumber ?? s.seqNo}
                    </td>
                    <td className="px-3 py-3 font-medium" style={{ color: "var(--text-dark)" }}>{s.name}</td>
                    <td className="px-3 py-3 text-xs" style={{ color: "var(--unmarked)" }}>
                      {s.enrollmentLabel.name}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => markAttendance(s, "PRESENT")}
                          className="px-3 py-1 rounded-lg text-xs font-medium border transition-colors"
                          style={
                            s.status === "PRESENT"
                              ? { backgroundColor: "var(--present)", borderColor: "var(--present)", color: "#fff" }
                              : { borderColor: "#C8DFC0", color: "var(--present)" }
                          }
                        >
                          出席
                        </button>
                        <button
                          onClick={() => markAttendance(s, "ABSENT")}
                          className="px-3 py-1 rounded-lg text-xs font-medium border transition-colors"
                          style={
                            s.status === "ABSENT"
                              ? { backgroundColor: "var(--absent)", borderColor: "var(--absent)", color: "#fff" }
                              : { borderColor: "#F0C8C8", color: "var(--absent)" }
                          }
                        >
                          請假
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        {!loading && (
          <div className="flex gap-3">
            <button
              onClick={handleComplete}
              disabled={completing || completed}
              className="flex-1 py-3 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {completing ? "儲存中…" : completed ? "點名已完成 ✓" : "完成點名"}
            </button>
            <Link
              href={`/class/${classId}/report`}
              className="px-5 py-3 rounded-xl border text-sm font-medium"
              style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
            >
              月報表
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
