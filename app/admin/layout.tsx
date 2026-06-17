import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <aside
        className="w-56 shrink-0 flex flex-col border-r"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--card-border)" }}>
          <Link href="/admin" className="text-base font-bold leading-tight" style={{ color: "var(--accent)" }}>
            Artpresso
          </Link>
          <p className="text-xs mt-0.5" style={{ color: "var(--unmarked)" }}>管理後台</p>
        </div>

        <AdminNav />

        <div className="mt-auto px-5 py-4 border-t text-xs" style={{ borderColor: "var(--card-border)", color: "var(--unmarked)" }}>
          <p className="font-medium" style={{ color: "var(--text-dark)" }}>{session.user.name}</p>
          <form action="/api/auth/signout" method="POST" className="mt-1">
            <button type="submit" className="hover:underline" style={{ color: "var(--accent)" }}>
              登出
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
