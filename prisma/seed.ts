import { PrismaClient, Role, BoardType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { GENERAL_BOARD_ID } from 'src/common/constants';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const adminPassword = await bcrypt.hash('2kkckw62', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskmanager.com' },
    update: {},
    create: {
      email: 'admin@taskmanager.com',
      username: 'System admin',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`👤 Admin user ensured: ${admin.email}`);

  const generalBoard = await prisma.board.upsert({
    where: {
      id: GENERAL_BOARD_ID,
    },
    update: {},
    create: {
      id: GENERAL_BOARD_ID,
      title: 'General Board',
      type: BoardType.PUBLIC,
      ownerId: admin.id,
    },
  });

  console.log(`📋 General Board ensured: ${generalBoard.id}`);
  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
