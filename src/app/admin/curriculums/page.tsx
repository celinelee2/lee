"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Semester = { id: string; name: string };
type Curriculum = {
  id: string; subject: string; description: string | null; isActive: boolean;
  semesterId: string;
  semester: { name: string } | null;
  _count: { items: number };
};

const S = { border: "1px solid #E0D5C2", background: "#FDFAF6" };
const L = { color: "#4A3B2A" };
const emptyForm = { semesterId: "", subject: "", description: "" };

export default function CurriculumsPage() {
  const [items, setItems] = useState<Curriculum[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"none" | "add" | "edit">("none");
  const [editing, setEditing] = useState<Curriculum | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterSemester, setFilterSemester] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: string[] } | null>(null);

  async function load() {
    setLoading(true);
    const [c, s] = await Promise.all([fetch("/api/admin/curriculums"), fetch("/api/admin/semesters")]);
    setItems(await c.json());
    setSemesters(await s.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function f(k: keyof typeof emptyForm, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = mode === "edit" ? `/api/admin/curriculums/${editing!.id}` : "/api/admin/curriculums";
    const method = mode === "edit" ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setMode("none");
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  function openEdit(c: Curriculum) {
    setEditing(c);
    setForm({ semesterId: c.semesterId, subject: c.subject, description: c.description ?? "" });
    setMode("edit");
  }

  async function toggleActive(c: Curriculum) {
    await fetch(`/api/admin/curriculums/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...c, isActive: !c.isActive }) });
    load();
  }

  async function handleDelete(c: Curriculum) {
    if (!confirm(`確定刪除「${c.subject}」課綱？此操作無法復原。`)) return;
    await fetch(`/api/admin/curriculums/${c.id}`, { method: "DELETE" });
    load();
  }

  async function handleBatchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadResult(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/curriculums/batch", { method: "POST", body: fd });
    setUploadResult(await res.json());
    setUploading(false); e.target.value = ""; load();
  }

  const filtered = filterSemester ? items.filter(c => c.semesterId === filterSemester) : items;

  return (
    <div className="min-h-screen" style={{ background: "#F7F2EA" }}>
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4" style={{ borderColor: "#E0D5C2" }}>
        <Link href="/admin" className="text-sm" style={{ color: "#8A7A63" }}>← 後台首頁</Link>
        <h1 className="font-bold text-lg" style={L}>課綱管理</h1>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <p className="text-sm" style={{ color: "#8A7A63" }}>共 {filtered.length} 份課綱</p>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm outline-none" style={S}>
              <option value="">全部學期</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/curriculums/template" className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>下載範本</a>
            <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ border: "1px solid #E0D5C2", color: "#8A6D3F", background: "white" }}>
              {uploading ? "上傳中..." : "批次上傳 CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleBatchUpload} disabled={uploading} />
            </label>
            <button onClick={() => { setMode(mode === "add" ? "none" : "add"); setEditing(null); setForm(emptyForm); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#8A6D3F" }}>
              {mode === "add" ? "取消" : "+ 新增課綱"}
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
            <h2 className="font-semibold mb-4" style={L}>{mode === "edit" ? `編輯：${editing?.subject}` : "新增課綱"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>所屬學期 *</label>
                  <select required value={form.semesterId} onChange={e => f("semesterId", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S}>
                    <option value="">請選擇</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={L}>科目 *</label>
                  <input required value={form.subject} onChange={e => f("subject", e.target.value)} placeholder="例如 幼兒美學" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={L}>說明</label>
                  <input value={form.description} onChange={e => f("description", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={S} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => { setMode("none"); setEditing(null); setForm(emptyForm); }}
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
            : filtered.length === 0 ? <div className="p-8 text-center text-sm" style={{ color: "#8A7A63" }}>尚無課綱</div>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #E0D5C2", background: "#FDFAF6" }}>
                    {["學期", "科目", "說明", "項目數", "狀態", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "#8A7A63" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #E0D5C2" : undefined }}>
                      <td className="px-4 py-3 text-xs" style={{ color: "#8A7A63" }}>{c.semester?.name ?? "—"}</td>
                      <td className="px-4 py-3 font-medium" style={L}>{c.subject}</td>
                      <td className="px-4 py-3" style={{ color: "#8A7A63" }}>{c.description ?? "—"}</td>
                      <td className="px-4 py-3 text-center" style={{ color: "#8A7A63" }}>{c._count.items}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: c.isActive ? "#F0F7EC" : "#F7F2EA", color: c.isActive ? "#3B6D11" : "#8A7A63" }}>
                          {c.isActive ? "使用中" : "停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(c)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: "#8A6D3F" }}>編輯</button>
                          <button onClick={() => toggleActive(c)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: c.isActive ? "#A32D2D" : "#3B6D11" }}>
                            {c.isActive ? "停用" : "啟用"}
                          </button>
                          <button onClick={() => handleDelete(c)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid #E0D5C2", color: "#A32D2D" }}>刪除</button>
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
