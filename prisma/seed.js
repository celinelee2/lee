const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "celinelee.sow@gmail.com";
  const passwordHash = await bcrypt.hash("Artpresso@2024", 12);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" (id, email, "passwordHash", name, role, "isActive", "createdAt")
    VALUES (gen_random_uuid()::text, $1, $2, '管理者', 'ADMIN', true, NOW())
    ON CONFLICT (email) DO UPDATE SET "passwordHash" = $2, role = 'ADMIN', "isActive" = true
  `, email, passwordHash);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "OrgSetting" (id, "orgName", "updatedAt")
    VALUES ('default', 'Artpresso國際教育中心', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  console.log("Seeded admin:", email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
