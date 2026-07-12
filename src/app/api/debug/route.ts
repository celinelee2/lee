import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = "celinelee.sow@gmail.com";
  const password = "Artpresso@2024";

  let prisma: PrismaClient;
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
  } catch (e: unknown) {
    return Response.json({ step: "connect_failed", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  try {
    const rows = await prisma.$queryRawUnsafe<{ email: string; role: string; isActive: boolean; passwordHash: string }[]>(
      `SELECT email, role, "isActive", "passwordHash" FROM "User" WHERE email = $1`,
      email
    );

    await prisma.$disconnect();

    if (rows.length === 0) {
      return Response.json({ step: "user_not_found", src: true });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.passwordHash);

    return Response.json({
      step: "ok",
      src: true,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hashPrefix: user.passwordHash.substring(0, 7),
      passwordMatch: match,
    });
  } catch (e: unknown) {
    await prisma.$disconnect().catch(() => {});
    return Response.json({ step: "query_failed", src: true, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
