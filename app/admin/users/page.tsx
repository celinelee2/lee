"use client";

import { useEffect, useState } from "react";
import BatchImportModal from "../_utils/BatchImportModal";
import { dropHeaderRow } from "../_utils/parseExcel";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [newUserInfo, setNewUserInfo] = useState<{ resetUrl: string | null } | null>(null);
  const [error, setError] = useState("");
  const [showBatch, setShowBatch] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/users");
    const data = await r.json();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    setSubmitting(false);
    if (!r.ok) { setError(data.error); return; }
    setNewUserInfo({ resetUrl: data.resetUrl });
    setForm({ name: "", email: "" });
    load();
  }

  async function toggleActive(user: User) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    load();
  }

  async function handleDelete(user: User) {
    if (!confirm(`確定要刪除「${user.name}」的帳號嗎？`)) return;
    const r = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json();
      alert(d.error);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>老師帳號</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBatch(true)}
            className="px-4 py-2 rounded-lg text-sm border font-medium"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            批次匯入
          </button>
          <button
            onClick={() => { setShowModal(true); setNewUserInfo(null); setError(""); }}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: "var(--accent)" }}
          >
            新增老師
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
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-dark)" }}>{u.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--unmarked)" }}>{u.email}</td>
                  <td className="px-4 py-3" style={{ color: "var(--unmarked)" }}>
                    {u.role === "ADMIN" ? "管理者" : "老師"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: u.isActive ? "#DCEFD3" : "#F5E0E0",
                        color: u.isActive ? "var(--present)" : "var(--absent)",
                      }}
                    >
                      {u.isActive ? "啟用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => toggleActive(u)}
                      className="text-xs hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      {u.isActive ? "停用" : "啟用"}
                    </button>
                    {u.role !== "ADMIN" && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-xs hover:underline"
                        style={{ color: "var(--absent)" }}
                      >
                        刪除
                      </button>
                    )}
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
            {newUserInfo ? (
              <div>
                <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-dark)" }}>帳號已建立</h2>
                {newUserInfo.resetUrl ? (
                  <div>
                    <p className="text-sm mb-2" style={{ color: "var(--unmarked)" }}>
                      Email 服務尚未設定，請手動將以下密碼設定連結傳送給老師：
                    </p>
                    <p
                      className="text-xs break-all p-3 rounded-lg border"
                      style={{ borderColor: "var(--card-border)", backgroundColor: "var(--bg)" }}
                    >
                      {newUserInfo.resetUrl}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--unmarked)" }}>
                    已寄送密碼設定信至老師 Email。
                  </p>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-4 w-full py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  完成
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-dark)" }}>新增老師帳號</h2>
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
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
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
                    {submitting ? "建立中…" : "建立"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showBatch && (
        <BatchImportModal
          title="批次匯入老師帳號"
          templateHint="第一欄姓名、第二欄 Email（首行標題可省略）："
          templateText={`姓名,Email\n王老師,wang@example.com\n李老師,li@example.com`}
          onClose={() => { setShowBatch(false); load(); }}
          onImport={async (rows) => {
            const data = dropHeaderRow(rows, "姓名")
              .filter((r) => r[0] && r[1])
              .map((r) => ({ name: r[0], email: r[1] }));
            if (data.length === 0) return "沒有有效資料";
            const r = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const d = await r.json();
            if (!r.ok) return d.error;
            const errMsg = d.errors?.length ? `（${d.errors.join("；")}）` : "";
            return `成功新增 ${d.count} 位老師${errMsg}`;
          }}
        />
      )}
    </div>
  );
}
