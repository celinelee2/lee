const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Artpresso@2024", 12);

  const admin = await prisma.user.upsert({
    where: { email: "celinelee.sow@gmail.com" },
    update: { passwordHash, role: "ADMIN", isActive: true },
    create: {
      email: "celinelee.sow@gmail.com",
      passwordHash,
      name: "管理者",
      role: "ADMIN",
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
