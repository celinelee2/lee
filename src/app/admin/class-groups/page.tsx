"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Semester = { id: string; name: string };
type School = { id: string; shortName: string; fullName: string };
type Teacher = { id: string; name: string; nickname: string | null; isActive: boolean };
type Course = { id: string; name: string; semesterId: string | null; isActive: boolean };
type ClassGroup = {
  id: string; className: string; subject: string | null;
  weekday: number; classTime: string; isActive: boolean;
  courseId: string | null; semesterId: string; schoolId: string; teacherId: string;
  assistant1Id: string | null; assistant2Id: string | null;
  course: { name: string } | null;
  semester: { name: string } | null;
  school: { shortName: string } | null;
  teacher: { name: string; nickname: string | null } | null;
  assistant1: { name: string; nickname: string | null } | null;
  assistant2: { name: string; nickname: string | null } | null;
  _count: { students: number };
};

const WEEKDAYS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const S = { border: "1px solid #E0D5C2", background: "#FDFAF6" };
const L = { color: "#4A3B2A" };
const emptyForm = {
  courseId: "", semesterId: "", schoolId: "", className: "",
  weekday: "1", classTime: "", teacherId: "",
  assistant1Id: "", assistant2Id: "",
};

function displayName(t: { name: string; nickname: string | null } | null) {
  if (!t) return "—";
  return t.nickname ? `${t.nickname}（${t.name}）` : t.name;
}

export default function ClassGroupsPage() {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"none" | "add" | "edit">("none");
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterSemester, setFilterSemester] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: string[] } | null>(null);

  async function load() {
    setLoading(true);
    const [g, s, sc, t, c] = await Promise.all([
      fetch("/api/admin/class-groups"),
      fetch("/api/admin/semesters"),
      fetch("/api/admin/schools"),
      fetch("/api/admin/users"),
      fetch("/api/admin/subjects"),
    ]);
    setGroups(await g.json());
    setSemesters(await s.json());
    setSchools(await sc.json());
    setTeachers(await t.json());
    setCourses(await c.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function f(k: keyof typeof emptyForm, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function onSemesterChange(semesterId: string) {
    setForm(p => {
      const course = courses.find(c => c.id === p.courseId);
      const courseStillValid = course && (!course.semesterId || course.semesterId === semesterId);
      return { ...p, semesterId, courseId: courseStillValid ? p.courseId : "" };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const payload = { ...form };
    const url = mode === "edit" ? `/api/admin/class-groups/${editing!.id}` : "/api/admin/class-groups";
    const method = mode === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error ?? "儲存失敗"); return; }
    setMode("none");
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  function openEdit(g: ClassGroup) {
    setEditing(g);
    setSaveError(null);
    setForm({
      courseId: g.courseId ?? "", semesterId: g.semesterId, schoolId: g.schoolId,
      className: g.className,
      weekday: String(g.weekday), classTime: g.classTime,
      teacherId: g.teacherId,
      assistant1Id: g.assistant1Id ?? "", assistant2Id: g.assistant2Id ?? "",
    });
    setMode("edit");
  }

  async function toggleActive(g: ClassGroup) {
    await fetch(`/api/admin/class-groups/${g.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...g, isActive: !g.isActive }),
    });
    load();
  }

  async function handleDelete(g: ClassGroup) {
    if (!confirm(`確定要刪除班級「${g.className}」嗎？此操作無法復原。`)) return;
    await fetch(`/api/admin/class-groups/${g.id}`, { method: "DELETE" });
    load();
  }

  async function handleBatchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadResult(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/class-groups/batch", { method: "POST", body: fd });
    setUploadResult(await res.json());
    setUploading(false); e.target.value = ""; load();
  }

  const filtered = filterSemester ? groups.filter(g => g.semesterId === filterSemester) : groups;

  return (
    <div className="min-h-screen" style={{ background: "#F7F2EA" }}>
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: "#E0D5C2" }}>
        <Link href="/admin" className="text-sm" style={{ color: "#8A7A63" }}>← 後台首頁</Link>
        <h1 className="font-bold text-lg" style={L}>班級管理</h1>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <p className="text-sm" style={{ color: "#8A7A63" }}>共 {filtered.length} 個班級</p>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm outline-none" style={S}>
              <option value="">全部學期</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/class-groups/template" className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>下載範本</a>
            <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>
              {uploading ? "上傳中..." : "批次上傳 CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleBatchUpload} disabled={uploading} />
            </label>
            <button onClick={() => { setMode(mode === "add" ? "none" : "add"); setEditing(null); setSaveError(null); setForm(emptyForm); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#8A6D3F" }}>
              {mode === "add" ? "取消" : "+ 新增班級"}
            </button>
          </div>
        </div>

        {uploadResult && (
          <div className="rounded-xl p-4 mb-6 text-sm" style={{
            background: uploadResult.errors.length === 0 ? "#F0F7EC" : "#FEF3F2",
            border: `1px solid ${uploadResult.errors.length === 0 ? "#C8DFB8" : "#FECDCA"}`,
          }}>
            <p className="font-medium mb-1" style={{ color: uploadResult.errors.length === 0 ? "#3B6D11" : "#A32D2D" }}>
              成功匯入 {uploadResult.success} 筆{uploadResult.errors.length > 0 && `，${uploadResult.errors.length} 筆失敗`}
            </p>
            {uploadResult.errors.map((err, i) => <p key={i} className="text-xs mt-0.5" style={{ color: "#A32D2D" }}>{err}</p>)}
            <button onClick={() => setUploadResult(null)} className="mt-2 text-xs underline" style={{ color: "#8A7A63" }}>關閉</button>
          </div>
        )}

        {(mode === "add" || mode === "edit") && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm" style={{ border: "1px solid #E0D5C2" }}>
            <h2 className="font-semibold mb-4" style={L}>{mode === "edit" ? `編輯：${editing?.className}` : "新增班級"}</h2>
            {saveError && (
              <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: "#FEF3F2", border: "1px solid #FECDCA", color: "#A32D2D" }}>
                錯誤：{saveError}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>所屬學期 *</label>
                  <select required value={form.semesterId} onChange={e => onSemesterChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    <option value="">請選擇</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>所屬課程</label>
                  <select value={form.courseId} onChange={e => f("courseId", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}
                    disabled={!form.semesterId}>
                    <option value="">{form.semesterId ? "未指定課程" : "請先選擇學期"}</option>
                    {courses.filter(c =>
                      (c.isActive || c.id === form.courseId) &&
                      (!c.semesterId || c.semesterId === form.semesterId || c.id === form.courseId)
                    ).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>所屬學校 *</label>
                  <select required value={form.schoolId} onChange={e => f("schoolId", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    <option value="">請選擇</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.shortName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>班級名稱 *</label>
                  <input required value={form.className} onChange={e => f("className", e.target.value)}
                    placeholder="例如 113下週三二甲班" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>星期 *</label>
                  <select required value={form.weekday} onChange={e => f("weekday", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>上課時間 *</label>
                  <input required value={form.classTime} onChange={e => f("classTime", e.target.value)}
                    placeholder="例如 16:00-17:00" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>授課老師 *</label>
                  <select required value={form.teacherId} onChange={e => f("teacherId", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    <option value="">請選擇</option>
                    {teachers.filter(t => t.isActive || t.id === form.teacherId).map(t => <option key={t.id} value={t.id}>{t.nickname ? `${t.nickname}（${t.name}）` : t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>助教一</label>
                  <select value={form.assistant1Id} onChange={e => f("assistant1Id", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    <option value="">無</option>
                    {teachers.filter(t => t.isActive || t.id === form.assistant1Id).map(t => <option key={t.id} value={t.id}>{t.nickname ? `${t.nickname}（${t.name}）` : t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>助教二</label>
                  <select value={form.assistant2Id} onChange={e => f("assistant2Id", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    <option value="">無</option>
                    {teachers.filter(t => t.isActive || t.id === form.assistant2Id).map(t => <option key={t.id} value={t.id}>{t.nickname ? `${t.nickname}（${t.name}）` : t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => { setMode("none"); setEditing(null); setSaveError(null); setForm(emptyForm); }}
                  className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid #E0D5C2", color: "#8A7A63" }}>取消</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: "#8A6D3F" }}>
                  {saving ? "儲存中..." : mode === "edit" ? "儲存" : "新增"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid #E0D5C2" }}>
          {loading ? <div className="p-8 text-center text-sm" style={{ color: "#8A7A63" }}>載入中...</div>
            : filtered.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "#8A7A63" }}>尚無班級</div>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #E0D5C2", background: "#FDFAF6" }}>
                    {["班級名稱", "學校", "課程", "時間", "主教", "學生數", "狀態", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g, i) => (
                    <tr key={g.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #E0D5C2" : undefined }}>
                      <td className="px-4 py-3 font-medium" style={L}>{g.className}</td>
                      <td className="px-4 py-3" style={{ color: "#8A7A63" }}>{g.school?.shortName ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#8A7A63" }}>
                        {g.course ? <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#FEF3C7", color: "#92400E" }}>{g.course.name}</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#8A7A63" }}>{WEEKDAYS[g.weekday]} {g.classTime}</td>
                      <td className="px-4 py-3" style={{ color: "#8A7A63" }}>{displayName(g.teacher)}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "#8A7A63" }}>{g._count.students}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: g.isActive ? "#F0F7EC" : "#F7F2EA", color: g.isActive ? "#3B6D11" : "#8A7A63" }}>
                          {g.isActive ? "進行中" : "已結束"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/admin/class-groups/${g.id}`} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: "#8A6D3F" }}>學生</Link>
                          <button onClick={() => openEdit(g)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: "#8A6D3F" }}>編輯</button>
                          <button onClick={() => toggleActive(g)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: g.isActive ? "#A32D2D" : "#3B6D11" }}>
                            {g.isActive ? "停用" : "啟用"}
                          </button>
                          <button onClick={() => handleDelete(g)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #FECDCA", color: "#A32D2D" }}>刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </main>
    </div>
  );
}
