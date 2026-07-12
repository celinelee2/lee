"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Semester = { id: string; name: string };
type Subject = {
  id: string; name: string; isActive: boolean; semesterId: string | null;
  courseStructure: string | null; ageGroup: string | null; totalSessions: number | null; totalHours: string | null;
  philosophy: string | null; learningGoals: string | null;
  coreCompetencies: string | null; assessment: string | null; notes: string | null;
  semester: { name: string } | null;
};

const S = { border: "1px solid #E0D5C2", background: "#FDFAF6" };
const L = { color: "#4A3B2A" };
const emptyForm = {
  semesterId: "", name: "", courseStructure: "", ageGroup: "", totalSessions: "", totalHours: "",
  philosophy: "", learningGoals: "", coreCompetencies: "", assessment: "", notes: "",
};

export default function ClassesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"none" | "add" | "edit">("none");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterSemester, setFilterSemester] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [copyTo, setCopyTo] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [c, s] = await Promise.all([fetch("/api/admin/subjects"), fetch("/api/admin/semesters")]);
    const cData = await c.json().catch(() => []);
    const sData = await s.json().catch(() => []);
    setSubjects(Array.isArray(cData) ? cData : []);
    setSemesters(Array.isArray(sData) ? sData : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function f(k: keyof typeof emptyForm, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const url = mode === "edit" ? `/api/admin/subjects/${editing!.id}` : "/api/admin/subjects";
    const method = mode === "edit" ? "PATCH" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? `HTTP ${res.status}`); setSaving(false); return; }
      setSaving(false);
      setMode("none");
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setSaveError(String(err));
      setSaving(false);
    }
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setForm({
      semesterId: s.semesterId ?? "", name: s.name, courseStructure: s.courseStructure ?? "", ageGroup: s.ageGroup ?? "",
      totalSessions: s.totalSessions ? String(s.totalSessions) : "",
      totalHours: s.totalHours ?? "", philosophy: s.philosophy ?? "",
      learningGoals: s.learningGoals ?? "", coreCompetencies: s.coreCompetencies ?? "",
      assessment: s.assessment ?? "", notes: s.notes ?? "",
    });
    setMode("edit");
  }

  async function toggleActive(s: Subject) {
    await fetch(`/api/admin/subjects/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: !s.isActive }) });
    load();
  }

  async function handleDelete(s: Subject) {
    if (!confirm(`確定要刪除「${s.name}」？此操作無法復原。`)) return;
    const res = await fetch(`/api/admin/subjects/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "刪除失敗");
    }
    load();
  }

  async function handleCopySemester() {
    if (!copyFrom || !copyTo) return;
    setCopying(true); setCopyResult(null);
    const res = await fetch("/api/admin/subjects/copy-semester", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromSemesterId: copyFrom, toSemesterId: copyTo }),
    });
    const data = await res.json();
    if (res.ok) {
      setCopyResult(`成功複製 ${data.copied} 個科目`);
      setCopyFrom(""); setCopyTo("");
      load();
    } else {
      setCopyResult(data.error ?? "複製失敗");
    }
    setCopying(false);
  }

  async function handleBatchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadResult(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/subjects/batch", { method: "POST", body: fd });
    setUploadResult(await res.json());
    setUploading(false); e.target.value = ""; load();
  }

  const filtered = filterSemester ? subjects.filter(s => s.semesterId === filterSemester) : subjects;

  return (
    <div className="min-h-screen" style={{ background: "#F7F2EA" }}>
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: "#E0D5C2" }}>
        <Link href="/admin" className="text-sm" style={{ color: "#8A7A63" }}>← 後台首頁</Link>
        <h1 className="font-bold text-lg" style={L}>科目管理</h1>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <p className="text-sm" style={{ color: "#8A7A63" }}>共 {filtered.filter(s => s.isActive).length} 個科目</p>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm outline-none" style={S}>
              <option value="">全部學期</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowCopy(!showCopy); setCopyResult(null); }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>
              複製學期
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/subjects/template" className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>下載範本</a>
            <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>
              {uploading ? "上傳中..." : "批次上傳 CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleBatchUpload} disabled={uploading} />
            </label>
            <button onClick={() => { setMode(mode === "add" ? "none" : "add"); setEditing(null); setForm(emptyForm); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#8A6D3F" }}>
              {mode === "add" ? "取消" : "+ 新增科目"}
            </button>
          </div>
        </div>

        {showCopy && (
          <div className="bg-white rounded-xl p-5 mb-6 shadow-sm" style={{ border: "1px solid #E0D5C2" }}>
            <h3 className="font-semibold mb-3 text-sm" style={L}>複製學期科目</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-xs mb-1" style={{ color: "#8A7A63" }}>來源學期</label>
                <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                  <option value="">請選擇</option>
                  {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <span className="text-sm mt-4" style={{ color: "#8A7A63" }}>→</span>
              <div>
                <label className="block text-xs mb-1" style={{ color: "#8A7A63" }}>目標學期</label>
                <select value={copyTo} onChange={e => setCopyTo(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                  <option value="">請選擇</option>
                  {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={handleCopySemester} disabled={!copyFrom || !copyTo || copying}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 mt-4" style={{ background: "#8A6D3F" }}>
                {copying ? "複製中..." : "確認複製"}
              </button>
            </div>
            {copyResult && (
              <p className="mt-3 text-sm" style={{ color: copyResult.includes("成功") ? "#3B6D11" : "#A32D2D" }}>{copyResult}</p>
            )}
          </div>
        )}

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
            <h2 className="font-semibold mb-4" style={L}>{mode === "edit" ? `編輯：${editing?.name}` : "新增科目"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>科目名稱 *</label>
                  <input required value={form.name} onChange={e => f("name", e.target.value)}
                    placeholder="例如 幼兒美學" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>所屬學期</label>
                  <select value={form.semesterId} onChange={e => f("semesterId", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    <option value="">未指定</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={L}>課程架構</label>
                  <textarea value={form.courseStructure} onChange={e => f("courseStructure", e.target.value)}
                    rows={3} placeholder="描述課程的整體架構與單元安排…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={S} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>適合年齡／學齡階段</label>
                  <input value={form.ageGroup} onChange={e => f("ageGroup", e.target.value)}
                    placeholder="例如 3-6歲、國小低年級" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={L}>總課堂數</label>
                    <input type="number" min="1" value={form.totalSessions} onChange={e => f("totalSessions", e.target.value)}
                      placeholder="堂" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={L}>課程時間</label>
                    <input type="number" min="1" value={form.totalHours} onChange={e => f("totalHours", e.target.value)}
                      placeholder="分鐘" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={L}>課程理念／設計初衷</label>
                  <textarea value={form.philosophy} onChange={e => f("philosophy", e.target.value)}
                    rows={3} placeholder="描述這個科目的設計理念與初衷…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={S} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={L}>學習指標</label>
                  <textarea value={form.learningGoals} onChange={e => f("learningGoals", e.target.value)}
                    rows={3} placeholder="描述學生完成課程後應達到的學習目標…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={S} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={L}>核心素養</label>
                  <textarea value={form.coreCompetencies} onChange={e => f("coreCompetencies", e.target.value)}
                    rows={3} placeholder="描述此科目培養的核心素養…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={S} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={L}>成效評量與延伸</label>
                  <textarea value={form.assessment} onChange={e => f("assessment", e.target.value)}
                    rows={3} placeholder="描述評量方式與課後延伸活動…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={S} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={L}>備註</label>
                  <input value={form.notes} onChange={e => f("notes", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                </div>
              </div>
              {saveError && (
                <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: "#FEF3F2", color: "#A32D2D", border: "1px solid #FECDCA" }}>
                  錯誤：{saveError}
                </p>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => { setMode("none"); setEditing(null); setForm(emptyForm); setSaveError(null); }}
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
            : filtered.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "#8A7A63" }}>尚無科目</div>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #E0D5C2", background: "#FDFAF6" }}>
                    {["科目名稱", "學期", "適合年齡", "堂數／時數", "狀態", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #E0D5C2" : undefined }}>
                      <td className="px-4 py-3 font-medium" style={L}>{s.name}</td>
                      <td className="px-4 py-3" style={{ color: "#8A7A63" }}>{s.semester?.name ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#8A7A63" }}>{s.ageGroup ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#8A7A63" }}>
                        {s.totalSessions ? `${s.totalSessions} 堂` : "—"}
                        {s.totalHours ? ` / ${s.totalHours} 分鐘` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: s.isActive ? "#F0F7EC" : "#F7F2EA", color: s.isActive ? "#3B6D11" : "#8A7A63" }}>
                          {s.isActive ? "使用中" : "停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(s)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: "#8A6D3F" }}>編輯</button>
                          <button onClick={() => toggleActive(s)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: s.isActive ? "#A32D2D" : "#3B6D11" }}>
                            {s.isActive ? "停用" : "啟用"}
                          </button>
                          <button onClick={() => handleDelete(s)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #FECDCA", color: "#A32D2D" }}>刪除</button>
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
