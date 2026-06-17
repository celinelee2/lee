"use client";

import { useEffect, useState } from "react";

type Label = { id: string; name: string; isActive: boolean; _count: { students: number } };

export default function EnrollmentLabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLabel, setEditLabel] = useState<Label | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/admin/enrollment-labels");
    setLabels(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditLabel(null);
    setName("");
    setError("");
    setShowModal(true);
  }

  function openEdit(label: Label) {
    setEditLabel(label);
    setName(label.name);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    let r: Response;
    if (editLabel) {
      r = await fetch(`/api/admin/enrollment-labels/${editLabel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } else {
      r = await fetch("/api/admin/enrollment-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }
    setSubmitting(false);
    if (!r.ok) { setError((await r.json()).error); return; }
    setShowModal(false);
    load();
  }

  async function toggleActive(label: Label) {
    await fetch(`/api/admin/enrollment-labels/${label.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !label.isActive }),
    });
    load();
  }

  async function handleDelete(label: Label) {
    if (!confirm(`確定要刪除班別「${label.name}」嗎？`)) return;
    const r = await fetch(`/api/admin/enrollment-labels/${label.id}`, { method: "DELETE" });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>班別管理</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: "var(--accent)" }}
        >
          新增班別
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--unmarked)" }}>載入中…</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--unmarked)" }}>
                <th className="px-4 py-3 font-medium">班別名稱</th>
                <th className="px-4 py-3 font-medium">學生數</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((l) => (
                <tr key={l.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-dark)" }}>{l.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--unmarked)" }}>{l._count.students}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: l.isActive ? "#DCEFD3" : "#F5E0E0",
                        color: l.isActive ? "var(--present)" : "var(--absent)",
                      }}
                    >
                      {l.isActive ? "啟用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => openEdit(l)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                      編輯
                    </button>
                    <button onClick={() => toggleActive(l)} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                      {l.isActive ? "停用" : "啟用"}
                    </button>
                    <button onClick={() => handleDelete(l)} className="text-xs hover:underline" style={{ color: "var(--absent)" }}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-dark)" }}>
                {editLabel ? "編輯班別" : "新增班別"}
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>班別名稱</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--card-border)" }}
                />
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
    </div>
  );
}
