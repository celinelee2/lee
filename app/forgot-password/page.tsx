"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: "var(--card-border)" }}>
        <h1 className="text-xl font-bold mb-1" style={{ color: "var(--text-dark)" }}>忘記密碼</h1>

        {sent ? (
          <div>
            <p className="text-sm mt-3" style={{ color: "var(--unmarked)" }}>
              若此 Email 有對應帳號，我們已寄送密碼重設連結，請查收信箱。
            </p>
            <Link href="/login" className="block mt-4 text-sm hover:underline" style={{ color: "var(--accent)" }}>
              返回登入
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>電子郵件</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--card-border)" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {loading ? "寄送中…" : "寄送重設連結"}
            </button>
            <Link href="/login" className="block text-center text-sm hover:underline" style={{ color: "var(--accent)" }}>
              返回登入
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
