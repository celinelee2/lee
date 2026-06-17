"use client";

import { useEffect, useState } from "react";
import BatchImportModal from "../_utils/BatchImportModal";
import { dropHeaderRow, WEEKDAY_MAP } from "../_utils/parseExcel";

type Teacher = { id: string; name: string };
type ClassTeacherLink = { userId: string; user: Teacher };
type Student = { id: string; name: string; studentNumber: string | null; isActive: boolean; enrollmentLabel: { name: string } };
type ClassStudent = { studentId: string; student: Student };
type ClassItem = {
  id: string;
  name: string;
  campus: string;
  subject: string;
  weekday: number;
  scheduleText: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  teachers: ClassTeacherLink[];
  _count: { studentLinks: number };
};

const WEEKDAYS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

const EMPTY_FORM = {
  name: "", campus: "", subject: "",
  weekday: "3", scheduleText: "",
  startDate: "", endDate: "",
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // class modal
  const [showModal, setShowModal] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // teacher assignment modal
  const [teacherModal, setTeacherModal] = useState<ClassItem | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());

  // batch import modals
  const [showBatchClass, setShowBatchClass] = useState(false);
  const [batchStudentModal, setBatchStudentModal] = useState<ClassItem | null>(null);

  // student assignment modal
  const [studentModal, setStudentModal] = useState<ClassItem | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<ClassStudent[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  async function load() {
    const [cr, ur] = await Promise.all([
      fetch("/api/admin/classes"),
      fetch("/api/admin/users"),
    ]);
    const classData = await cr.json();
    const userData = await ur.json();
    setClasses(classData);
    setAllTeachers(userData.filter((u: { role: string }) => u.role === "TEACHER"));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── class CRUD ──────────────────────────────────────────
  function openCreate() {
    setEditClass(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(cls: ClassItem) {
    setEditClass(cls);
    setForm({
      name: cls.name,
      campus: cls.campus,
      subject: cls.subject,
      weekday: String(cls.weekday),
      scheduleText: cls.scheduleText,
      startDate: cls.startDate.slice(0, 10),
      endDate: cls.endDate.slice(0, 10),
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const payload = { ...form, weekday: Number(form.weekday) };
    let r: Response;
    if (editClass) {
      r = await fetch(`/api/admin/classes/${editClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      r = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSubmitting(false);
    if (!r.ok) { setError((await r.json()).error); return; }
    setShowModal(false);
    load();
  }

  async function toggleActive(cls: ClassItem) {
    await fetch(`/api/admin/classes/${cls.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cls.isActive }),
    });
    load();
  }

  async function handleDelete(cls: ClassItem) {
    if (!confirm(`確定要刪除課程時段「${cls.name}」嗎？`)) return;
    const r = await fetch(`/api/admin/classes/${cls.id}`, { method: "DELETE" });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  // ── teacher assignment ───────────────────────────────────
  async function openTeacherModal(cls: ClassItem) {
    setTeacherModal(cls);
    setSelectedTeachers(new Set(cls.teachers.map((t) => t.userId)));
  }

  async function saveTeachers() {
    if (!teacherModal) return;
    const current = new Set(teacherModal.teachers.map((t) => t.userId));

    const toAdd = [...selectedTeachers].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !selectedTeachers.has(id));

    await Promise.all([
      ...toAdd.map((userId) =>
        fetch(`/api/admin/classes/${teacherModal.id}/teachers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
      ),
      ...toRemove.map((userId) =>
        fetch(`/api/admin/classes/${teacherModal.id}/teachers`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
      ),
    ]);

    setTeacherModal(null);
    load();
  }

  // ── student assignment ───────────────────────────────────
  async function openStudentModal(cls: ClassItem) {
    const [detail, sr] = await Promise.all([
      fetch(`/api/admin/classes/${cls.id}`).then((r) => r.json()),
      fetch("/api/admin/students").then((r) => r.json()),
    ]);
    setAssignedStudents(detail.studentLinks ?? []);
    setAllStudents(sr);
    setSelectedStudents(new Set((detail.studentLinks ?? []).map((l: ClassStudent) => l.studentId)));
    setStudentSearch("");
    setStudentModal(cls);
  }

  async function saveStudents() {
    if (!studentModal) return;
    const current = new Set(assignedStudents.map((l) => l.studentId));

    const toAdd = [...selectedStudents].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !selectedStudents.has(id));

    await Promise.all([
      ...toAdd.map((studentId) =>
        fetch(`/api/admin/classes/${studentModal.id}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        })
      ),
      ...toRemove.map((studentId) =>
        fetch(`/api/admin/classes/${studentModal.id}/students`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        })
      ),
    ]);

    setStudentModal(null);
    load();
  }

  const filteredStudents = allStudents.filter(
    (s) =>
      s.isActive &&
      (studentSearch === "" ||
        s.name.includes(studentSearch) ||
        s.enrollmentLabel.name.includes(studentSearch))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>課程時段</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBatchClass(true)}
            className="px-4 py-2 rounded-lg text-sm border font-medium"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            批次匯入
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: "var(--accent)" }}
          >
            新增課程時段
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--unmarked)" }}>載入中…</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--unmarked)" }}>
                <th className="px-4 py-3 font-medium">名稱</th>
                <th className="px-4 py-3 font-medium">校區 / 科目</th>
                <th className="px-4 py-3 font-medium">時程</th>
                <th className="px-4 py-3 font-medium">老師</th>
                <th className="px-4 py-3 font-medium">學生</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-dark)" }}>{cls.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--unmarked)" }}>
                    {cls.campus}<br />{cls.subject}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--unmarked)" }}>
                    {WEEKDAYS[cls.weekday]}<br />{cls.scheduleText}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openTeacherModal(cls)}
                      className="text-xs hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      {cls.teachers.length > 0
                        ? cls.teachers.map((t) => t.user.name).join("、")
                        : "未指派"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => openStudentModal(cls)}
                        className="text-xs hover:underline text-left"
                        style={{ color: "var(--accent)" }}
                      >
                        {cls._count.studentLinks} 人
                      </button>
                      <button
                        onClick={() => setBatchStudentModal(cls)}
                        className="text-xs hover:underline text-left"
                        style={{ color: "var(--unmarked)" }}
                      >
                        批次匯入
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: cls.isActive ? "#DCEFD3" : "#F5E0E0",
                        color: cls.isActive ? "var(--present)" : "var(--absent)",
                      }}
                    >
                      {cls.isActive ? "開課中" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => openEdit(cls)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                      編輯
                    </button>
                    <button onClick={() => toggleActive(cls)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                      {cls.isActive ? "停用" : "開課"}
                    </button>
                    <button onClick={() => handleDelete(cls)} className="text-xs hover:underline" style={{ color: "var(--absent)" }}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/編輯 modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-dark)" }}>
                {editClass ? "編輯課程時段" : "新增課程時段"}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "課程名稱", key: "name", span: 2 },
                  { label: "上課校區", key: "campus" },
                  { label: "上課科目", key: "subject" },
                  { label: "上課時程（顯示用）", key: "scheduleText", span: 2, placeholder: "例：週三 16:00-17:00" },
                ].map(({ label, key, span, placeholder }) => (
                  <div key={key} className={span === 2 ? "col-span-2" : ""}>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>{label}</label>
                    <input
                      type="text"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required
                      placeholder={placeholder}
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ borderColor: "var(--card-border)" }}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>星期幾</label>
                  <select
                    value={form.weekday}
                    onChange={(e) => setForm({ ...form, weekday: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--card-border)" }}
                  >
                    {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div />
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>開課日期</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--card-border)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>結課日期</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--card-border)" }}
                  />
                </div>
              </div>
              {error && <p className="mt-2 text-xs" style={{ color: "var(--absent)" }}>{error}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {submitting ? "儲存中…" : "儲存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 指派老師 modal */}
      {teacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-dark)" }}>指派老師</h2>
            <p className="text-xs mb-4" style={{ color: "var(--unmarked)" }}>{teacherModal.name}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allTeachers.map((t) => (
                <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTeachers.has(t.id)}
                    onChange={(e) => {
                      const next = new Set(selectedTeachers);
                      e.target.checked ? next.add(t.id) : next.delete(t.id);
                      setSelectedTeachers(next);
                    }}
                    className="w-4 h-4"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-dark)" }}>{t.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setTeacherModal(null)}
                className="flex-1 py-2 rounded-lg text-sm border"
                style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
              >
                取消
              </button>
              <button
                onClick={saveTeachers}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: "var(--accent)" }}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理學生 modal */}
      {studentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-dark)" }}>管理學生</h2>
            <p className="text-xs mb-3" style={{ color: "var(--unmarked)" }}>{studentModal.name}</p>
            <input
              type="text"
              placeholder="搜尋姓名或班別…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none mb-2"
              style={{ borderColor: "var(--card-border)" }}
            />
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {filteredStudents.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(s.id)}
                    onChange={(e) => {
                      const next = new Set(selectedStudents);
                      e.target.checked ? next.add(s.id) : next.delete(s.id);
                      setSelectedStudents(next);
                    }}
                    className="w-4 h-4 shrink-0"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="text-sm flex-1" style={{ color: "var(--text-dark)" }}>{s.name}</span>
                  <span className="text-xs" style={{ color: "var(--unmarked)" }}>{s.enrollmentLabel.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--unmarked)" }}>
              已選 {selectedStudents.size} 人
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStudentModal(null)}
                className="flex-1 py-2 rounded-lg text-sm border"
                style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
              >
                取消
              </button>
              <button
                onClick={saveStudents}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: "var(--accent)" }}
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批次匯入課程時段 */}
      {showBatchClass && (
        <BatchImportModal
          title="批次匯入課程時段"
          templateHint="欄位順序：名稱、校區、科目、星期幾（0-6 或 週一-週六）、上課時程、開課日期（YYYY-MM-DD）、結課日期"
          templateText={`名稱,校區,科目,星期幾,上課時程,開課日期,結課日期\n週三素描班,健康國小,素描,3,週三 16:00-17:00,2026-09-01,2027-01-31`}
          onClose={() => { setShowBatchClass(false); load(); }}
          onImport={async (rows) => {
            const data = dropHeaderRow(rows, "名稱")
              .filter((r) => r[0] && r[1] && r[2])
              .map((r) => ({
                name: r[0], campus: r[1], subject: r[2],
                weekday: WEEKDAY_MAP[r[3]] ?? Number(r[3]),
                scheduleText: r[4] ?? "",
                startDate: r[5] ?? "", endDate: r[6] ?? "",
              }));
            if (data.length === 0) return "沒有有效資料";
            const res = await fetch("/api/admin/classes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const d = await res.json();
            if (!res.ok) return d.error;
            return `成功新增 ${d.count} 個課程時段`;
          }}
        />
      )}

      {/* 批次分配學生到班級 */}
      {batchStudentModal && (
        <BatchImportModal
          title={`批次分配學生 — ${batchStudentModal.name}`}
          templateHint="第一欄學生姓名、第二欄班別（選填，用於區分同名）："
          templateText={`學生姓名,班別\n王小明,3年級A班\n陳美琪,`}
          onClose={() => { setBatchStudentModal(null); load(); }}
          onImport={async (rows) => {
            const allStudentsRes = await fetch("/api/admin/students");
            const allStudents: Student[] = await allStudentsRes.json();

            const toAssign = dropHeaderRow(rows, "學生")
              .filter((r) => r[0])
              .map((r) => {
                const name = r[0];
                const label = r[1] ?? "";
                return allStudents.find(
                  (s) => s.isActive && s.name === name && (!label || s.enrollmentLabel.name === label)
                );
              })
              .filter((s): s is Student => s !== undefined);

            if (toAssign.length === 0) return "找不到符合的學生，請確認姓名與班別正確";

            await Promise.all(
              toAssign.map((s) =>
                fetch(`/api/admin/classes/${batchStudentModal.id}/students`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ studentId: s.id }),
                })
              )
            );
            return `成功分配 ${toAssign.length} 位學生`;
          }}
        />
      )}
    </div>
  );
}
