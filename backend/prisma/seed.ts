import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clean existing data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Cleaning existing data for development...');

      await prisma.auditLog.deleteMany();
      await prisma.session.deleteMany();
      await prisma.transaction.deleteMany();
      await prisma.budgetAllocation.deleteMany();
      await prisma.paymentAttribution.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.spendingCategory.deleteMany();
      await prisma.budgetCategory.deleteMany();
      await prisma.incomeEvent.deleteMany();
      await prisma.bankAccount.deleteMany();
      await prisma.familyMember.deleteMany();
      await prisma.family.deleteMany();
    }

    // Create sample family
    console.log('👨‍👩‍👧‍👦 Creating sample family...');
    const family = await prisma.family.create({
      data: {
        name: 'Johnson Family',
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          fiscalYearStart: 1,
        },
        subscriptionStatus: 'active',
        dataRetentionConsent: true,
      },
    });

    // Create family members
    console.log('👥 Creating family members...');
    const passwordHash = await bcrypt.hash('TempPassword123!', 12);

    const adminMember = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        email: 'john.johnson@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Johnson',
        role: 'admin',
        permissions: {
          canManageBankAccounts: true,
          canEditPayments: true,
          canViewReports: true,
          canManageFamily: true,
        },
        emailVerified: true,
        mfaEnabled: false,
      },
    });

    const editorMember = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        email: 'sarah.johnson@example.com',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'editor',
        permissions: {
          canManageBankAccounts: false,
          canEditPayments: true,
          canViewReports: true,
          canManageFamily: false,
        },
        emailVerified: true,
        mfaEnabled: false,
      },
    });

    // Create budget categories
    console.log('📊 Creating budget categories...');
    const needsCategory = await prisma.budgetCategory.create({
      data: {
        familyId: family.id,
        name: 'Needs',
        targetPercentage: 50.00,
        color: '#dc2626',
        sortOrder: 1,
        isActive: true,
      },
    });

    const wantsCategory = await prisma.budgetCategory.create({
      data: {
        familyId: family.id,
        name: 'Wants',
        targetPercentage: 30.00,
        color: '#2563eb',
        sortOrder: 2,
        isActive: true,
      },
    });

    const savingsCategory = await prisma.budgetCategory.create({
      data: {
        familyId: family.id,
        name: 'Savings',
        targetPercentage: 20.00,
        color: '#16a34a',
        sortOrder: 3,
        isActive: true,
      },
    });

    // Create spending categories
    console.log('🏷️ Creating spending categories...');
    const housingCategory = await prisma.spendingCategory.create({
      data: {
        familyId: family.id,
        name: 'Housing',
        budgetCategoryId: needsCategory.id,
        icon: 'home',
        color: '#dc2626',
        monthlyTarget: 1500.00,
        isActive: true,
      },
    });

    const utilitiesCategory = await prisma.spendingCategory.create({
      data: {
        familyId: family.id,
        name: 'Utilities',
        budgetCategoryId: needsCategory.id,
        icon: 'zap',
        color: '#dc2626',
        monthlyTarget: 250.00,
        isActive: true,
      },
    });

    const groceriesCategory = await prisma.spendingCategory.create({
      data: {
        familyId: family.id,
        name: 'Groceries',
        budgetCategoryId: needsCategory.id,
        icon: 'shopping-cart',
        color: '#dc2626',
        monthlyTarget: 600.00,
        isActive: true,
      },
    });

    const entertainmentCategory = await prisma.spendingCategory.create({
      data: {
        familyId: family.id,
        name: 'Entertainment',
        budgetCategoryId: wantsCategory.id,
        icon: 'film',
        color: '#2563eb',
        monthlyTarget: 300.00,
        isActive: true,
      },
    });

    const diningOutCategory = await prisma.spendingCategory.create({
      data: {
        familyId: family.id,
        name: 'Dining Out',
        budgetCategoryId: wantsCategory.id,
        icon: 'utensils',
        color: '#2563eb',
        monthlyTarget: 400.00,
        isActive: true,
      },
    });

    const emergencyCategory = await prisma.spendingCategory.create({
      data: {
        familyId: family.id,
        name: 'Emergency Fund',
        budgetCategoryId: savingsCategory.id,
        icon: 'shield',
        color: '#16a34a',
        monthlyTarget: 500.00,
        isActive: true,
      },
    });

    // Create sample bank accounts
    console.log('🏦 Creating sample bank accounts...');
    const checkingAccount = await prisma.bankAccount.create({
      data: {
        familyId: family.id,
        plaidAccountId: 'demo_checking_001',
        plaidItemId: 'demo_item_001',
        institutionName: 'Chase Bank',
        accountName: 'Johnson Family Checking',
        accountType: 'checking',
        accountNumber: '1234',
        currentBalance: 2847.65,
        availableBalance: 2847.65,
        syncStatus: 'active',
        lastSyncAt: new Date(),
      },
    });

    const savingsAccount = await prisma.bankAccount.create({
      data: {
        familyId: family.id,
        plaidAccountId: 'demo_savings_001',
        plaidItemId: 'demo_item_001',
        institutionName: 'Chase Bank',
        accountName: 'Johnson Family Savings',
        accountType: 'savings',
        accountNumber: '5678',
        currentBalance: 12500.00,
        availableBalance: 12500.00,
        syncStatus: 'active',
        lastSyncAt: new Date(),
      },
    });

    const creditAccount = await prisma.bankAccount.create({
      data: {
        familyId: family.id,
        plaidAccountId: 'demo_credit_001',
        plaidItemId: 'demo_item_002',
        institutionName: 'American Express',
        accountName: 'Blue Cash Preferred',
        accountType: 'credit',
        accountNumber: '9012',
        currentBalance: -1234.56,
        availableBalance: 3765.44,
        syncStatus: 'active',
        lastSyncAt: new Date(),
      },
    });

    // Create sample income events
    console.log('💰 Creating sample income events...');
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const johnSalary = await prisma.incomeEvent.create({
      data: {
        familyId: family.id,
        name: "John's Salary",
        amount: 4200.00,
        scheduledDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        frequency: 'monthly',
        nextOccurrence: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15),
        status: 'received',
        actualDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        actualAmount: 4200.00,
        source: 'Tech Corp Inc.',
        notes: 'Monthly salary deposit',
      },
    });

    const sarahSalary = await prisma.incomeEvent.create({
      data: {
        familyId: family.id,
        name: "Sarah's Salary",
        amount: 3800.00,
        scheduledDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        frequency: 'monthly',
        nextOccurrence: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
        status: 'received',
        actualDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        actualAmount: 3800.00,
        source: 'Design Studio LLC',
        notes: 'Monthly salary deposit',
      },
    });

    const freelanceIncome = await prisma.incomeEvent.create({
      data: {
        familyId: family.id,
        name: 'Freelance Project',
        amount: 1500.00,
        scheduledDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
        frequency: 'once',
        status: 'scheduled',
        source: 'Client XYZ',
        notes: 'Web development project',
      },
    });

    // Create sample payments
    console.log('💳 Creating sample payments...');
    const rentPayment = await prisma.payment.create({
      data: {
        familyId: family.id,
        payee: 'Sunrise Property Management',
        amount: 1800.00,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        status: 'paid',
        paidDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        paidAmount: 1800.00,
        paymentType: 'recurring',
        frequency: 'monthly',
        nextDueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
        spendingCategoryId: housingCategory.id,
        autoPayEnabled: true,
        notes: 'Monthly rent payment',
      },
    });

    const electricBill = await prisma.payment.create({
      data: {
        familyId: family.id,
        payee: 'Metro Electric Company',
        amount: 125.00,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        status: 'scheduled',
        paymentType: 'recurring',
        frequency: 'monthly',
        nextDueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        spendingCategoryId: utilitiesCategory.id,
        autoPayEnabled: false,
        notes: 'Monthly electricity bill',
      },
    });

    const internetBill = await prisma.payment.create({
      data: {
        familyId: family.id,
        payee: 'FastNet Internet',
        amount: 79.99,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 10),
        status: 'paid',
        paidDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 10),
        paidAmount: 79.99,
        paymentType: 'recurring',
        frequency: 'monthly',
        nextDueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10),
        spendingCategoryId: utilitiesCategory.id,
        autoPayEnabled: true,
        notes: 'Monthly internet service',
      },
    });

    const carInsurance = await prisma.payment.create({
      data: {
        familyId: family.id,
        payee: 'SafeDrive Insurance',
        amount: 145.00,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 25),
        status: 'scheduled',
        paymentType: 'recurring',
        frequency: 'monthly',
        nextDueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 25),
        spendingCategoryId: housingCategory.id,
        autoPayEnabled: false,
        notes: 'Car insurance premium',
      },
    });

    // Create payment attributions
    console.log('🔗 Creating payment attributions...');
    await prisma.paymentAttribution.create({
      data: {
        paymentId: rentPayment.id,
        incomeEventId: sarahSalary.id,
        amount: 1800.00,
        attributionType: 'automatic',
        createdBy: adminMember.id,
      },
    });

    await prisma.paymentAttribution.create({
      data: {
        paymentId: internetBill.id,
        incomeEventId: johnSalary.id,
        amount: 79.99,
        attributionType: 'automatic',
        createdBy: adminMember.id,
      },
    });

    // Create budget allocations
    console.log('📈 Creating budget allocations...');
    await prisma.budgetAllocation.create({
      data: {
        incomeEventId: johnSalary.id,
        budgetCategoryId: needsCategory.id,
        amount: 2100.00,
        percentage: 50.00,
      },
    });

    await prisma.budgetAllocation.create({
      data: {
        incomeEventId: johnSalary.id,
        budgetCategoryId: wantsCategory.id,
        amount: 1260.00,
        percentage: 30.00,
      },
    });

    await prisma.budgetAllocation.create({
      data: {
        incomeEventId: johnSalary.id,
        budgetCategoryId: savingsCategory.id,
        amount: 840.00,
        percentage: 20.00,
      },
    });

    await prisma.budgetAllocation.create({
      data: {
        incomeEventId: sarahSalary.id,
        budgetCategoryId: needsCategory.id,
        amount: 1900.00,
        percentage: 50.00,
      },
    });

    await prisma.budgetAllocation.create({
      data: {
        incomeEventId: sarahSalary.id,
        budgetCategoryId: wantsCategory.id,
        amount: 1140.00,
        percentage: 30.00,
      },
    });

    await prisma.budgetAllocation.create({
      data: {
        incomeEventId: sarahSalary.id,
        budgetCategoryId: savingsCategory.id,
        amount: 760.00,
        percentage: 20.00,
      },
    });

    // Create sample transactions
    console.log('📱 Creating sample transactions...');
    const transactionDates = [
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 3),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 7),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 10),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 12),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 18),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 20),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 22),
    ];

    const sampleTransactions = [
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_001',
        amount: -85.67,
        date: transactionDates[0],
        description: 'WHOLE FOODS MARKET',
        merchantName: 'Whole Foods Market',
        spendingCategoryId: groceriesCategory.id,
        categoryConfidence: 0.95,
        userCategorized: false,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_002',
        amount: -45.23,
        date: transactionDates[1],
        description: 'SHELL GAS STATION',
        merchantName: 'Shell',
        spendingCategoryId: null,
        categoryConfidence: 0.80,
        userCategorized: false,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_003',
        amount: -125.00,
        date: transactionDates[2],
        description: 'METRO ELECTRIC AUTOPAY',
        merchantName: 'Metro Electric',
        spendingCategoryId: utilitiesCategory.id,
        categoryConfidence: 0.99,
        userCategorized: false,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_004',
        amount: -28.75,
        date: transactionDates[3],
        description: 'NETFLIX.COM',
        merchantName: 'Netflix',
        spendingCategoryId: entertainmentCategory.id,
        categoryConfidence: 0.95,
        userCategorized: false,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_005',
        amount: 4200.00,
        date: transactionDates[4],
        description: 'TECH CORP PAYROLL',
        merchantName: 'Tech Corp Inc',
        spendingCategoryId: null,
        categoryConfidence: 0.99,
        userCategorized: false,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_006',
        amount: -67.89,
        date: transactionDates[5],
        description: 'OLIVE GARDEN',
        merchantName: 'Olive Garden',
        spendingCategoryId: diningOutCategory.id,
        categoryConfidence: 0.90,
        userCategorized: false,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_007',
        amount: -112.34,
        date: transactionDates[6],
        description: 'TARGET STORES',
        merchantName: 'Target',
        spendingCategoryId: groceriesCategory.id,
        categoryConfidence: 0.75,
        userCategorized: true,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_008',
        amount: -79.99,
        date: transactionDates[7],
        description: 'FASTNET AUTOPAY',
        merchantName: 'FastNet Internet',
        spendingCategoryId: utilitiesCategory.id,
        categoryConfidence: 0.99,
        userCategorized: false,
      },
      {
        bankAccountId: checkingAccount.id,
        plaidTransactionId: 'demo_txn_009',
        amount: -42.50,
        date: transactionDates[8],
        description: 'STARBUCKS',
        merchantName: 'Starbucks',
        spendingCategoryId: diningOutCategory.id,
        categoryConfidence: 0.85,
        userCategorized: false,
      },
      {
        bankAccountId: savingsAccount.id,
        plaidTransactionId: 'demo_txn_010',
        amount: 500.00,
        date: transactionDates[9],
        description: 'TRANSFER FROM CHECKING',
        merchantName: null,
        spendingCategoryId: emergencyCategory.id,
        categoryConfidence: 0.95,
        userCategorized: true,
      },
    ];

    for (const txn of sampleTransactions) {
      await prisma.transaction.create({ data: txn });
    }

    // Create sample sessions
    console.log('🔐 Creating sample sessions...');
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 1);

    await prisma.session.create({
      data: {
        familyMemberId: adminMember.id,
        token: 'demo_session_token_admin_' + Date.now(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Mac) Chrome/120.0.0.0 Safari/537.36',
        expiresAt: sessionExpiry,
      },
    });

    // Create sample audit logs
    console.log('📋 Creating sample audit logs...');
    await prisma.auditLog.create({
      data: {
        familyId: family.id,
        familyMemberId: adminMember.id,
        action: 'create',
        entityType: 'Family',
        entityId: family.id,
        newValues: {
          name: family.name,
          subscriptionStatus: family.subscriptionStatus,
        },
        ipAddress: '192.168.1.100',
      },
    });

    await prisma.auditLog.create({
      data: {
        familyId: family.id,
        familyMemberId: adminMember.id,
        action: 'login',
        entityType: 'Session',
        entityId: adminMember.id,
        newValues: {
          loginAt: new Date(),
          userAgent: 'Mozilla/5.0 (Mac) Chrome/120.0.0.0 Safari/537.36',
        },
        ipAddress: '192.168.1.100',
      },
    });

    // Update allocated amounts for income events
    console.log('🔄 Updating allocated amounts...');
    await prisma.incomeEvent.update({
      where: { id: sarahSalary.id },
      data: { allocatedAmount: 1800.00, remainingAmount: 2000.00 },
    });

    await prisma.incomeEvent.update({
      where: { id: johnSalary.id },
      data: { allocatedAmount: 79.99, remainingAmount: 4120.01 },
    });

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- 1 family created: ${family.name}`);
    console.log(`- 2 family members created`);
    console.log(`- 3 budget categories created`);
    console.log(`- 6 spending categories created`);
    console.log(`- 3 bank accounts created`);
    console.log(`- 3 income events created`);
    console.log(`- 4 payments created`);
    console.log(`- 6 budget allocations created`);
    console.log(`- 2 payment attributions created`);
    console.log(`- 10 transactions created`);
    console.log(`- 1 session created`);
    console.log(`- 2 audit logs created`);

    console.log('\n🔐 Test Login Credentials:');
    console.log('Admin: john.johnson@example.com / TempPassword123!');
    console.log('Editor: sarah.johnson@example.com / TempPassword123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });