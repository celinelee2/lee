import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = "celinelee.sow@gmail.com";
  const password = "Artpresso@2024";

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, isActive: true, passwordHash: true },
    });

    if (!user) {
      return Response.json({ step: "user_not_found", email });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    return Response.json({
      step: "ok",
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hashPrefix: user.passwordHash.substring(0, 7),
      passwordMatch: match,
    });
  } catch (e: unknown) {
    return Response.json({
      step: "db_error",
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
