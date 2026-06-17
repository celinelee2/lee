import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--bg)" }}>
      <h1 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>
        管理者後台
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--unmarked)" }}>
        管理功能（開發中）
      </p>
    </div>
  );
}
