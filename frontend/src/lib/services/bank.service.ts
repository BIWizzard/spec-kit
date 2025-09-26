import { prisma } from '../prisma';
import { plaidClient } from '../plaid';
import { BankAccount, Transaction, Prisma } from '@prisma/client';
import {
  AccountsGetRequest,
  TransactionsGetRequest,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  WebhookType,
  ItemWebhookUpdateRequest,
} from 'plaid';

export type ConnectBankAccountData = {
  publicToken: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      mask: string;
      type: string;
      subtype: string;
    }>;
  };
};

export type SyncBankAccountOptions = {
  startDate?: Date;
  endDate?: Date;
  count?: number;
  offset?: number;
};

export type BankAccountFilter = {
  includeDisconnected?: boolean;
  accountType?: 'checking' | 'savings' | 'credit' | 'loan';
  syncStatus?: 'active' | 'error' | 'disconnected';
};

export class BankService {
  static async createLinkToken(familyId: string, userId: string): Promise<string> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
      include: { family: true },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canManageBankAccounts) {
      throw new Error('Insufficient permissions to connect bank accounts');
    }

    const request: LinkTokenCreateRequest = {
      products: ['transactions'],
      client_name: 'Family Finance',
      country_codes: ['US'],
      language: 'en',
      user: {
        client_user_id: userId,
      },
      webhook: process.env.PLAID_WEBHOOK_URL,
    };

    try {
      const response = await plaidClient.linkTokenCreate(request);
      return response.data.link_token;
    } catch (error) {
      throw new Error(`Failed to create Plaid link token: ${error.message}`);
    }
  }

  static async connectBankAccount(
    familyId: string,
    userId: string,
    data: ConnectBankAccountData
  ): Promise<BankAccount[]> {
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canManageBankAccounts) {
      throw new Error('Insufficient permissions to connect bank accounts');
    }

    try {
      // Exchange public token for access token
      const exchangeRequest: ItemPublicTokenExchangeRequest = {
        public_token: data.publicToken,
      };
      const exchangeResponse = await plaidClient.itemPublicTokenExchange(exchangeRequest);
      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;

      // Set up webhook
      const webhookRequest: ItemWebhookUpdateRequest = {
        access_token: accessToken,
        webhook: process.env.PLAID_WEBHOOK_URL,
      };
      await plaidClient.itemWebhookUpdate(webhookRequest);

      // Get account details
      const accountsRequest: AccountsGetRequest = {
        access_token: accessToken,
      };
      const accountsResponse = await plaidClient.accountsGet(accountsRequest);

      // Create bank accounts in database
      const bankAccounts: BankAccount[] = [];

      for (const account of accountsResponse.data.accounts) {
        const bankAccount = await prisma.bankAccount.create({
          data: {
            familyId,
            plaidAccountId: account.account_id,
            plaidItemId: itemId,
            plaidAccessToken: accessToken, // Store encrypted in production
            institutionName: data.metadata.institution.name,
            institutionId: data.metadata.institution.institution_id,
            accountName: account.name,
            accountType: this.mapPlaidAccountType(account.type),
            accountSubtype: account.subtype || '',
            accountNumber: account.mask || '',
            currentBalance: new Prisma.Decimal(account.balances.current || 0),
            availableBalance: new Prisma.Decimal(account.balances.available || 0),
            lastSyncAt: new Date(),
            syncStatus: 'active',
          },
        });

        bankAccounts.push(bankAccount);
      }

      // Initial transaction sync
      await this.syncTransactions(familyId, bankAccounts[0].id);

      return bankAccounts;
    } catch (error) {
      throw new Error(`Failed to connect bank account: ${error.message}`);
    }
  }

  static async getBankAccounts(
    familyId: string,
    filter?: BankAccountFilter
  ): Promise<BankAccount[]> {
    const where: Prisma.BankAccountWhereInput = {
      familyId,
      ...(filter?.includeDisconnected !== true && { deletedAt: null }),
      ...(filter?.accountType && { accountType: filter.accountType }),
      ...(filter?.syncStatus && { syncStatus: filter.syncStatus }),
    };

    return prisma.bankAccount.findMany({
      where,
      orderBy: [
        { syncStatus: 'asc' }, // Active accounts first
        { institutionName: 'asc' },
        { accountName: 'asc' },
      ],
    });
  }

  static async getBankAccountById(
    familyId: string,
    accountId: string
  ): Promise<BankAccount | null> {
    return prisma.bankAccount.findFirst({
      where: {
        id: accountId,
        familyId,
        deletedAt: null,
      },
    });
  }

  static async updateBankAccount(
    familyId: string,
    accountId: string,
    data: {
      accountName?: string;
      syncStatus?: 'active' | 'error' | 'disconnected';
    }
  ): Promise<BankAccount> {
    const bankAccount = await this.getBankAccountById(familyId, accountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    return prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        ...(data.accountName && { accountName: data.accountName }),
        ...(data.syncStatus && { syncStatus: data.syncStatus }),
        updatedAt: new Date(),
      },
    });
  }

  static async deleteBankAccount(familyId: string, accountId: string): Promise<void> {
    const bankAccount = await this.getBankAccountById(familyId, accountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete bank account
      await tx.bankAccount.update({
        where: { id: accountId },
        data: {
          deletedAt: new Date(),
          syncStatus: 'disconnected',
        },
      });

      // Keep transactions for audit trail but mark as from deleted account
      await tx.transaction.updateMany({
        where: { bankAccountId: accountId },
        data: { updatedAt: new Date() },
      });
    });
  }

  static async syncTransactions(
    familyId: string,
    accountId: string,
    options?: SyncBankAccountOptions
  ): Promise<{ newCount: number; updatedCount: number }> {
    const bankAccount = await this.getBankAccountById(familyId, accountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    if (!bankAccount.plaidAccessToken) {
      throw new Error('Bank account not properly connected');
    }

    try {
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const request: TransactionsGetRequest = {
        access_token: bankAccount.plaidAccessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        count: options?.count || 500,
        offset: options?.offset || 0,
        account_ids: [bankAccount.plaidAccountId],
      };

      const response = await plaidClient.transactionsGet(request);

      let newCount = 0;
      let updatedCount = 0;

      for (const plaidTransaction of response.data.transactions) {
        const existingTransaction = await prisma.transaction.findUnique({
          where: { plaidTransactionId: plaidTransaction.transaction_id },
        });

        const transactionData = {
          bankAccountId: accountId,
          plaidTransactionId: plaidTransaction.transaction_id,
          amount: new Prisma.Decimal(Math.abs(plaidTransaction.amount)),
          date: new Date(plaidTransaction.date),
          description: plaidTransaction.name,
          merchantName: plaidTransaction.merchant_name || null,
          pending: plaidTransaction.pending,
          plaidCategoryId: plaidTransaction.category_id || null,
          plaidCategory: plaidTransaction.category?.join(' > ') || null,
          accountOwner: plaidTransaction.account_owner || null,
        };

        if (existingTransaction) {
          await prisma.transaction.update({
            where: { id: existingTransaction.id },
            data: transactionData,
          });
          updatedCount++;
        } else {
          await prisma.transaction.create({
            data: transactionData,
          });
          newCount++;
        }
      }

      // Update bank account sync status
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'active',
        },
      });

      return { newCount, updatedCount };
    } catch (error) {
      // Update sync status to error
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { syncStatus: 'error' },
      });

      throw new Error(`Failed to sync transactions: ${error.message}`);
    }
  }

  static async syncAllBankAccounts(familyId: string): Promise<{
    totalAccounts: number;
    successCount: number;
    errorCount: number;
    results: Array<{ accountId: string; status: 'success' | 'error'; error?: string; newCount?: number; updatedCount?: number }>;
  }> {
    const bankAccounts = await this.getBankAccounts(familyId, {
      includeDisconnected: false,
      syncStatus: 'active',
    });

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const account of bankAccounts) {
      try {
        const syncResult = await this.syncTransactions(familyId, account.id);
        results.push({
          accountId: account.id,
          status: 'success' as const,
          newCount: syncResult.newCount,
          updatedCount: syncResult.updatedCount,
        });
        successCount++;
      } catch (error) {
        results.push({
          accountId: account.id,
          status: 'error' as const,
          error: error.message,
        });
        errorCount++;
      }
    }

    return {
      totalAccounts: bankAccounts.length,
      successCount,
      errorCount,
      results,
    };
  }

  static async reconnectBankAccount(
    familyId: string,
    accountId: string,
    publicToken: string
  ): Promise<BankAccount> {
    const bankAccount = await this.getBankAccountById(familyId, accountId);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    try {
      // Exchange new public token
      const exchangeRequest: ItemPublicTokenExchangeRequest = {
        public_token: publicToken,
      };
      const exchangeResponse = await plaidClient.itemPublicTokenExchange(exchangeRequest);
      const accessToken = exchangeResponse.data.access_token;

      // Update bank account with new access token
      const updatedAccount = await prisma.bankAccount.update({
        where: { id: accountId },
        data: {
          plaidAccessToken: accessToken,
          syncStatus: 'active',
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Trigger initial sync
      await this.syncTransactions(familyId, accountId);

      return updatedAccount;
    } catch (error) {
      throw new Error(`Failed to reconnect bank account: ${error.message}`);
    }
  }

  static async handlePlaidWebhook(webhookType: WebhookType, webhookCode: string, itemId: string): Promise<void> {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { plaidItemId: itemId },
    });

    if (bankAccounts.length === 0) {
      console.warn(`No bank accounts found for Plaid item ${itemId}`);
      return;
    }

    switch (webhookType) {
      case WebhookType.Transactions:
        if (webhookCode === 'TRANSACTIONS_REMOVED') {
          // Handle removed transactions
          console.log('Transactions removed webhook received');
        } else {
          // Sync new/updated transactions for all accounts in this item
          for (const account of bankAccounts) {
            try {
              await this.syncTransactions(account.familyId, account.id);
            } catch (error) {
              console.error(`Failed to sync transactions for account ${account.id}:`, error);
            }
          }
        }
        break;

      case WebhookType.Item:
        if (webhookCode === 'ERROR') {
          // Mark accounts as having sync errors
          await prisma.bankAccount.updateMany({
            where: { plaidItemId: itemId },
            data: { syncStatus: 'error' },
          });
        } else if (webhookCode === 'PENDING_EXPIRATION') {
          // Notify user that account needs to be reconnected
          console.log('Item pending expiration webhook received');
        }
        break;

      default:
        console.log(`Unhandled webhook type: ${webhookType}, code: ${webhookCode}`);
    }
  }

  private static mapPlaidAccountType(plaidType: string): 'checking' | 'savings' | 'credit' | 'loan' {
    switch (plaidType.toLowerCase()) {
      case 'depository':
        return 'checking'; // Default depository to checking
      case 'credit':
        return 'credit';
      case 'loan':
        return 'loan';
      default:
        return 'checking';
    }
  }
}