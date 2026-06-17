import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();
  if (!session) {
    return { session: null as never, error: NextResponse.json({ error: "未授權" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { session: null as never, error: NextResponse.json({ error: "無權限" }, { status: 403 }) };
  }
  return { session, error: null };
}
