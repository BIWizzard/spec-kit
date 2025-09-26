import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.familyMember.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        createdAt: true,
        family: {
          select: {
            name: true
          }
        }
      }
    });

    if (users.length === 0) {
      console.log('No users found in database');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);
    users.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Family: ${user.family.name}`);
      console.log(`   Verified: ${user.emailVerified ? '✅' : '❌'}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();