"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("兩次輸入的密碼不一致"); return; }
    setLoading(true);
    const r = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!r.ok) { setError((await r.json()).error); return; }
    router.push("/login?reset=1");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: "var(--card-border)" }}>
        <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-dark)" }}>設定新密碼</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>新密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--card-border)" }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--unmarked)" }}>至少 8 個字元</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>確認新密碼</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--card-border)" }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: "var(--absent)" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {loading ? "儲存中…" : "儲存新密碼"}
          </button>
        </form>
        <Link href="/login" className="block mt-3 text-center text-sm hover:underline" style={{ color: "var(--accent)" }}>
          返回登入
        </Link>
      </div>
    </div>
  );
}
