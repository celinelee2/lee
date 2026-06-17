import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "celinelee.sow@gmail.com" },
    update: {},
    create: {
      email: "celinelee.sow@gmail.com",
      passwordHash,
      name: "管理者",
      role: Role.ADMIN,
    },
  });

  await prisma.orgSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      orgName: "Artpresso國際教育中心",
    },
  });

  console.log("Seeded admin:", admin.email);
  console.log("Initial password: changeme123! — please change after first login.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
