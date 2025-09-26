import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUserByEmail(email: string) {
  try {
    console.log(`🔍 Searching for user with email: ${email}`);

    // Find the user
    const user = await prisma.familyMember.findUnique({
      where: { email },
      include: {
        family: true,
        sessions: true
      }
    });

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`   Family: ${user.family.name} (ID: ${user.familyId})`);

    // Check if this user is the only member of the family
    const familyMemberCount = await prisma.familyMember.count({
      where: { familyId: user.familyId }
    });

    console.log(`   Family has ${familyMemberCount} member(s)`);

    // Delete user sessions first
    const deletedSessions = await prisma.session.deleteMany({
      where: { familyMemberId: user.id }
    });
    console.log(`   Deleted ${deletedSessions.count} session(s)`);

    // Delete the user
    await prisma.familyMember.delete({
      where: { id: user.id }
    });
    console.log(`✅ Deleted user: ${email}`);

    // If this was the only family member, delete the family too
    if (familyMemberCount === 1) {
      // Delete all family-related data
      await prisma.auditLog.deleteMany({ where: { familyId: user.familyId } });
      await prisma.paymentAttribution.deleteMany({
        where: {
          payment: { familyId: user.familyId }
        }
      });
      await prisma.budgetAllocation.deleteMany({
        where: {
          incomeEvent: { familyId: user.familyId }
        }
      });
      await prisma.transaction.deleteMany({
        where: {
          bankAccount: { familyId: user.familyId }
        }
      });
      await prisma.payment.deleteMany({ where: { familyId: user.familyId } });
      await prisma.incomeEvent.deleteMany({ where: { familyId: user.familyId } });
      await prisma.bankAccount.deleteMany({ where: { familyId: user.familyId } });
      await prisma.spendingCategory.deleteMany({ where: { familyId: user.familyId } });
      await prisma.budgetCategory.deleteMany({ where: { familyId: user.familyId } });

      // Finally, delete the family
      await prisma.family.delete({
        where: { id: user.familyId }
      });
      console.log(`✅ Deleted family: ${user.family.name} (was empty)`);
    }

    console.log('✨ Cleanup complete!');
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address as an argument');
  console.log('Usage: npx ts-node scripts/delete-user.ts <email>');
  process.exit(1);
}

deleteUserByEmail(email);