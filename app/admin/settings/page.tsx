"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { setOrgName(d.orgName ?? ""); setLoading(false); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-dark)" }}>系統設定</h1>
      {loading ? (
        <p className="text-sm" style={{ color: "var(--unmarked)" }}>載入中…</p>
      ) : (
        <form onSubmit={handleSave} className="max-w-sm space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>
              機構名稱
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--card-border)" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--unmarked)" }}>
              顯示於點名表表頭最上方
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {saved ? "已儲存 ✓" : "儲存"}
          </button>
        </form>
      )}
    </div>
  );
}
