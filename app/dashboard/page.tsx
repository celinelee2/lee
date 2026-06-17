import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--bg)" }}>
      <h1 className="text-xl font-bold" style={{ color: "var(--text-dark)" }}>
        歡迎，{session.user.name}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--unmarked)" }}>
        課程時段列表（開發中）
      </p>
    </div>
  );
}
