"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("帳號或密碼錯誤");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border p-8" style={{ borderColor: "var(--card-border)" }}>
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "var(--text-dark)" }}>
          Artpresso 點名系統
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: "var(--unmarked)" }}>
          請登入您的帳號
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>
              電子郵件
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: "var(--card-border)", outlineColor: "var(--accent)" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-dark)" }}>
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: "var(--card-border)", outlineColor: "var(--accent)" }}
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--absent)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-white font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)", borderRadius: "8px" }}
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/forgot-password" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
            忘記密碼？
          </a>
        </div>
      </div>
    </div>
  );
}
