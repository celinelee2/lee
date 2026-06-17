"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

type Label = { id: string; name: string; isActive: boolean };
type Student = {
  id: string;
  name: string;
  studentNumber: string | null;
  isActive: boolean;
  enrollmentLabel: Label;
};

const BATCH_TEMPLATE = `姓名,班別,學號
王小明,3年級A班,
陳美琪,4年級B班,B001`;

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({ name: "", studentNumber: "", enrollmentLabelId: "" });

  const [showBatch, setShowBatch] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchResult, setBatchResult] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [sr, lr] = await Promise.all([
      fetch("/api/admin/students"),
      fetch("/api/admin/enrollment-labels"),
    ]);
    setStudents(await sr.json());
    setLabels(await lr.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditStudent(null);
    setForm({ name: "", studentNumber: "", enrollmentLabelId: labels[0]?.id ?? "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(s: Student) {
    setEditStudent(s);
    setForm({ name: s.name, studentNumber: s.studentNumber ?? "", enrollmentLabelId: s.enrollmentLabel.id });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    let r: Response;
    if (editStudent) {
      r = await fetch(`/api/admin/students/${editStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      r = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSubmitting(false);
    if (!r.ok) { setError((await r.json()).error); return; }
    setShowModal(false);
    load();
  }

  async function toggleActive(s: Student) {
    await fetch(`/api/admin/students/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  async function handleDelete(s: Student) {
    if (!confirm(`確定要刪除學生「${s.name}」嗎？`)) return;
    const r = await fetch(`/api/admin/students/${s.id}`, { method: "DELETE" });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchResult("");

    if (file.name.endsWith(".csv")) {
      setBatchText(await file.text());
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
      setBatchText(rows.map((r) => r.join(",")).join("\n"));
    }
    // reset so same file can be re-selected
    e.target.value = "";
  }

  async function handleBatchImport() {
    setError("");
    const lines = batchText.trim().split("\n").filter(Boolean);
    const dataLines = lines[0]?.startsWith("姓名") ? lines.slice(1) : lines;
    if (dataLines.length === 0) { setBatchResult("沒有有效資料"); return; }

    const labelMap = Object.fromEntries(labels.map((l) => [l.name, l.id]));
    const parsed: { name: string; enrollmentLabelId: string; studentNumber?: string }[] = [];
    const missing: string[] = [];

    for (const line of dataLines) {
      const [name, labelName, num] = line.split(",").map((s) => s.trim());
      if (!name || !labelName) continue;
      const labelId = labelMap[labelName];
      if (!labelId) { missing.push(labelName); continue; }
      parsed.push({ name, enrollmentLabelId: labelId, studentNumber: num || undefined });
    }

    if (missing.length > 0) {
      setBatchResult(`找不到班別：${[...new Set(missing)].join("、")}，請先建立班別`);
      return;
    }

    setSubmitting(true);
    const r = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setSubmitting(false);
    const d = await r.json();
    if (!r.ok) { setBatchResult(d.error); return; }
    setBatchResult(`成功匯入 ${d.count} 位學生`);
    load();
  }

  const filtered = students.filter(
    (s) => s.name.includes(search) || s.enrollmentLabel.name.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>學生名單</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBatch(true); setBatchText(""); setBatchResult(""); }}
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
            新增學生
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="搜尋姓名或班別…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-xs border rounded-lg px-3 py-2 text-sm outline-none"
        style={{ borderColor: "var(--card-border)" }}
      />

      {loading ? (
        <p className="text-sm" style={{ color: "var(--unmarked)" }}>載入中…</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--unmarked)" }}>
                <th className="px-4 py-3 font-medium">學號</th>
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">班別</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--unmarked)" }}>
                    {s.studentNumber || String(idx + 1)}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-dark)" }}>{s.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--unmarked)" }}>{s.enrollmentLabel.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: s.isActive ? "#DCEFD3" : "#F5E0E0",
                        color: s.isActive ? "var(--present)" : "var(--absent)",
                      }}
                    >
                      {s.isActive ? "在學" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => openEdit(s)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                      編輯
                    </button>
                    <button onClick={() => toggleActive(s)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                      {s.isActive ? "停用" : "復學"}
                    </button>
                    <button onClick={() => handleDelete(s)} className="text-xs hover:underline" style={{ color: "var(--absent)" }}>
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
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-dark)" }}>
                {editStudent ? "編輯學生" : "新增學生"}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>姓名</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--card-border)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>
                    班別
                  </label>
                  <select
                    value={form.enrollmentLabelId}
                    onChange={(e) => setForm({ ...form, enrollmentLabelId: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--card-border)" }}
                  >
                    {labels.filter((l) => l.isActive || editStudent?.enrollmentLabel.id === l.id).map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>
                    學號（選填）
                  </label>
                  <input
                    type="text"
                    value={form.studentNumber}
                    onChange={(e) => setForm({ ...form, studentNumber: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--card-border)" }}
                  />
                </div>
                {error && <p className="text-xs" style={{ color: "var(--absent)" }}>{error}</p>}
              </div>
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

      {/* 批次匯入 modal */}
      {showBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-dark)" }}>批次匯入學生</h2>
            <p className="text-xs mb-3" style={{ color: "var(--unmarked)" }}>
              貼上 CSV 格式（第一行可選擇性加入標題列），班別名稱須與已建立的班別完全一致：
            </p>
            <pre
              className="text-xs p-3 rounded-lg mb-3 border"
              style={{ backgroundColor: "var(--bg)", borderColor: "var(--card-border)", color: "var(--unmarked)" }}
            >
              {BATCH_TEMPLATE}
            </pre>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-sm border font-medium"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                上傳 Excel / CSV 檔案
              </button>
              <span className="text-xs" style={{ color: "var(--unmarked)" }}>
                或直接貼上文字↓
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              rows={8}
              placeholder="貼上 CSV 內容，或點上方按鈕上傳 Excel / CSV 檔案…"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none font-mono"
              style={{ borderColor: "var(--card-border)" }}
            />
            {batchResult && (
              <p className="mt-2 text-sm" style={{ color: batchResult.startsWith("成功") ? "var(--present)" : "var(--absent)" }}>
                {batchResult}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowBatch(false)}
                className="flex-1 py-2 rounded-lg text-sm border"
                style={{ borderColor: "var(--card-border)", color: "var(--text-dark)" }}
              >
                關閉
              </button>
              <button
                onClick={handleBatchImport}
                disabled={submitting || !batchText.trim()}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {submitting ? "匯入中…" : "匯入"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
