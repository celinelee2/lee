import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role: string }).role;
  if (role === "ADMIN") redirect("/admin");
  redirect("/dashboard");
}
