import { prisma } from '../lib/prisma';
import { plaidClient } from '../lib/plaid';
import {
  WebhookType,
  TransactionsGetRequest,
  AccountsGetRequest,
  InstitutionsGetRequest,
  ItemGetRequest,
  LinkTokenCreateRequest,
  AssetReportCreateRequest,
  IdentityGetRequest,
  AuthGetRequest,
  LiabilitiesGetRequest,
  InvestmentsGetRequest,
} from 'plaid';

export type PlaidWebhookData = {
  webhookType: WebhookType;
  webhookCode: string;
  itemId: string;
  error?: any;
  newTransactions?: number;
  removedTransactions?: string[];
  consentExpirationTime?: string;
};

export type PlaidSyncResult = {
  bankAccountId: string;
  status: 'success' | 'error';
  newTransactions: number;
  updatedTransactions: number;
  error?: string;
};

export type PlaidInstitutionData = {
  institutionId: string;
  name: string;
  products: string[];
  countryCodes: string[];
  url?: string;
  primaryColor?: string;
  logo?: string;
  routingNumbers: string[];
  status: {
    itemLogins: {
      status: string;
      lastStatusChange: string;
    };
  };
};

export type PlaidAccountBalance = {
  accountId: string;
  plaidAccountId: string;
  current: number;
  available: number;
  limit?: number;
  lastUpdated: Date;
};

export type PlaidItemStatus = {
  itemId: string;
  institutionId: string;
  institutionName: string;
  status: 'good' | 'requires_user_action' | 'pending_expiration' | 'degraded';
  lastUpdate: Date;
  error?: {
    errorType: string;
    errorCode: string;
    displayMessage: string;
  };
  accounts: Array<{
    accountId: string;
    name: string;
    type: string;
    subtype: string;
    balance: number;
  }>;
};

export class PlaidIntegrationService {
  static async handleWebhook(webhookData: PlaidWebhookData): Promise<void> {
    console.log(`Processing Plaid webhook: ${webhookData.webhookType}.${webhookData.webhookCode}`);

    try {
      switch (webhookData.webhookType) {
        case WebhookType.Transactions:
          await this.handleTransactionsWebhook(webhookData);
          break;
        case WebhookType.Item:
          await this.handleItemWebhook(webhookData);
          break;
        case WebhookType.Auth:
          await this.handleAuthWebhook(webhookData);
          break;
        case WebhookType.Identity:
          await this.handleIdentityWebhook(webhookData);
          break;
        case WebhookType.Assets:
          await this.handleAssetsWebhook(webhookData);
          break;
        default:
          console.warn(`Unhandled webhook type: ${webhookData.webhookType}`);
      }

      // Log webhook processing
      await this.logWebhookEvent(webhookData, 'processed');

    } catch (error) {
      console.error('Error processing Plaid webhook:', error);
      await this.logWebhookEvent(webhookData, 'error', error.message);
      throw error;
    }
  }

  static async syncAllTransactions(familyId: string): Promise<PlaidSyncResult[]> {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        familyId,
        syncStatus: { in: ['active', 'error'] },
        plaidAccessToken: { not: null },
        deletedAt: null,
      },
    });

    const results: PlaidSyncResult[] = [];

    for (const account of bankAccounts) {
      try {
        const result = await this.syncTransactionsForAccount(account.id);
        results.push(result);
      } catch (error) {
        results.push({
          bankAccountId: account.id,
          status: 'error',
          newTransactions: 0,
          updatedTransactions: 0,
          error: error.message,
        });
      }
    }

    return results;
  }

  static async syncTransactionsForAccount(bankAccountId: string): Promise<PlaidSyncResult> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount || !bankAccount.plaidAccessToken) {
      throw new Error('Bank account not found or not connected to Plaid');
    }

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const request: TransactionsGetRequest = {
        access_token: bankAccount.plaidAccessToken,
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        account_ids: [bankAccount.plaidAccountId],
        count: 500,
        offset: 0,
      };

      const response = await plaidClient.transactionsGet(request);
      let newTransactions = 0;
      let updatedTransactions = 0;

      for (const plaidTransaction of response.data.transactions) {
        const existingTransaction = await prisma.transaction.findUnique({
          where: { plaidTransactionId: plaidTransaction.transaction_id },
        });

        const transactionData = {
          bankAccountId,
          plaidTransactionId: plaidTransaction.transaction_id,
          amount: Math.abs(plaidTransaction.amount),
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
          updatedTransactions++;
        } else {
          await prisma.transaction.create({
            data: transactionData,
          });
          newTransactions++;
        }
      }

      // Update bank account sync status
      await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'active',
        },
      });

      return {
        bankAccountId,
        status: 'success',
        newTransactions,
        updatedTransactions,
      };

    } catch (error) {
      // Update sync status to error
      await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { syncStatus: 'error' },
      });

      throw error;
    }
  }

  static async getAccountBalances(familyId: string): Promise<PlaidAccountBalance[]> {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        familyId,
        plaidAccessToken: { not: null },
        syncStatus: 'active',
        deletedAt: null,
      },
    });

    const balances: PlaidAccountBalance[] = [];

    for (const account of bankAccounts) {
      try {
        const request: AccountsGetRequest = {
          access_token: account.plaidAccessToken!,
          account_ids: [account.plaidAccountId],
        };

        const response = await plaidClient.accountsGet(request);
        const plaidAccount = response.data.accounts[0];

        if (plaidAccount) {
          balances.push({
            accountId: account.id,
            plaidAccountId: plaidAccount.account_id,
            current: plaidAccount.balances.current || 0,
            available: plaidAccount.balances.available || 0,
            limit: plaidAccount.balances.limit || undefined,
            lastUpdated: new Date(),
          });

          // Update stored balances
          await prisma.bankAccount.update({
            where: { id: account.id },
            data: {
              currentBalance: plaidAccount.balances.current || 0,
              availableBalance: plaidAccount.balances.available || 0,
              updatedAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error(`Failed to get balance for account ${account.id}:`, error);
      }
    }

    return balances;
  }

  static async getInstitutionInfo(institutionId: string): Promise<PlaidInstitutionData | null> {
    try {
      const request: InstitutionsGetRequest = {
        institution_ids: [institutionId],
        country_codes: ['US'],
        options: {
          include_optional_metadata: true,
          include_status: true,
        },
      };

      const response = await plaidClient.institutionsGet(request);
      const institution = response.data.institutions[0];

      if (!institution) return null;

      return {
        institutionId: institution.institution_id,
        name: institution.name,
        products: institution.products,
        countryCodes: institution.country_codes,
        url: institution.url || undefined,
        primaryColor: institution.primary_color || undefined,
        logo: institution.logo || undefined,
        routingNumbers: institution.routing_numbers,
        status: {
          itemLogins: {
            status: institution.status?.item_logins?.status || 'unknown',
            lastStatusChange: institution.status?.item_logins?.last_status_change || new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      console.error('Error fetching institution info:', error);
      return null;
    }
  }

  static async getItemStatus(familyId: string): Promise<PlaidItemStatus[]> {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        familyId,
        plaidAccessToken: { not: null },
        deletedAt: null,
      },
    });

    const itemStatusMap = new Map<string, PlaidItemStatus>();

    for (const account of bankAccounts) {
      try {
        // Skip if we already checked this item
        if (itemStatusMap.has(account.plaidItemId)) {
          const existingStatus = itemStatusMap.get(account.plaidItemId)!;
          existingStatus.accounts.push({
            accountId: account.id,
            name: account.accountName,
            type: account.accountType,
            subtype: account.accountSubtype || '',
            balance: Number(account.currentBalance),
          });
          continue;
        }

        const itemRequest: ItemGetRequest = {
          access_token: account.plaidAccessToken!,
        };

        const itemResponse = await plaidClient.itemGet(itemRequest);
        const item = itemResponse.data.item;

        const accountsRequest: AccountsGetRequest = {
          access_token: account.plaidAccessToken!,
        };

        const accountsResponse = await plaidClient.accountsGet(accountsRequest);

        // Get institution info
        const institutionInfo = await this.getInstitutionInfo(item.institution_id!);

        let status: PlaidItemStatus['status'] = 'good';
        let error: PlaidItemStatus['error'] | undefined;

        if (item.error) {
          switch (item.error.error_code) {
            case 'ITEM_LOGIN_REQUIRED':
              status = 'requires_user_action';
              break;
            case 'PENDING_EXPIRATION':
              status = 'pending_expiration';
              break;
            default:
              status = 'degraded';
          }

          error = {
            errorType: item.error.error_type,
            errorCode: item.error.error_code,
            displayMessage: item.error.display_message || item.error.error_message,
          };
        }

        const itemStatus: PlaidItemStatus = {
          itemId: item.item_id,
          institutionId: item.institution_id!,
          institutionName: institutionInfo?.name || 'Unknown Institution',
          status,
          lastUpdate: new Date(),
          error,
          accounts: [{
            accountId: account.id,
            name: account.accountName,
            type: account.accountType,
            subtype: account.accountSubtype || '',
            balance: Number(account.currentBalance),
          }],
        };

        itemStatusMap.set(account.plaidItemId, itemStatus);

      } catch (error) {
        console.error(`Failed to get item status for account ${account.id}:`, error);
      }
    }

    return Array.from(itemStatusMap.values());
  }

  static async createLinkTokenForUpdate(itemId: string, userId: string): Promise<string> {
    try {
      const request: LinkTokenCreateRequest = {
        products: [],
        client_name: 'Family Finance',
        country_codes: ['US'],
        language: 'en',
        user: {
          client_user_id: userId,
        },
        access_token: undefined, // Will be set by Plaid
        update: {
          account_selection_enabled: true,
        },
      };

      // Get the access token for this item
      const bankAccount = await prisma.bankAccount.findFirst({
        where: { plaidItemId: itemId },
      });

      if (!bankAccount?.plaidAccessToken) {
        throw new Error('Access token not found for item');
      }

      request.access_token = bankAccount.plaidAccessToken;

      const response = await plaidClient.linkTokenCreate(request);
      return response.data.link_token;

    } catch (error) {
      throw new Error(`Failed to create link token for update: ${error.message}`);
    }
  }

  static async refreshItemData(itemId: string): Promise<void> {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { plaidItemId: itemId },
    });

    if (bankAccounts.length === 0) {
      throw new Error('No accounts found for item');
    }

    const accessToken = bankAccounts[0].plaidAccessToken;
    if (!accessToken) {
      throw new Error('No access token found for item');
    }

    try {
      // Refresh account data
      const accountsRequest: AccountsGetRequest = {
        access_token: accessToken,
      };

      const accountsResponse = await plaidClient.accountsGet(accountsRequest);

      // Update account balances
      for (const plaidAccount of accountsResponse.data.accounts) {
        const bankAccount = bankAccounts.find(acc => acc.plaidAccountId === plaidAccount.account_id);
        if (bankAccount) {
          await prisma.bankAccount.update({
            where: { id: bankAccount.id },
            data: {
              currentBalance: plaidAccount.balances.current || 0,
              availableBalance: plaidAccount.balances.available || 0,
              lastSyncAt: new Date(),
              syncStatus: 'active',
            },
          });
        }
      }

      // Sync recent transactions
      for (const bankAccount of bankAccounts) {
        await this.syncTransactionsForAccount(bankAccount.id);
      }

    } catch (error) {
      // Update all accounts to error status
      await prisma.bankAccount.updateMany({
        where: { plaidItemId: itemId },
        data: { syncStatus: 'error' },
      });

      throw error;
    }
  }

  private static async handleTransactionsWebhook(webhookData: PlaidWebhookData): Promise<void> {
    switch (webhookData.webhookCode) {
      case 'INITIAL_UPDATE':
      case 'HISTORICAL_UPDATE':
      case 'DEFAULT_UPDATE':
        // Sync transactions for all accounts in this item
        const bankAccounts = await prisma.bankAccount.findMany({
          where: { plaidItemId: webhookData.itemId },
        });

        for (const account of bankAccounts) {
          try {
            await this.syncTransactionsForAccount(account.id);
          } catch (error) {
            console.error(`Failed to sync transactions for account ${account.id}:`, error);
          }
        }
        break;

      case 'TRANSACTIONS_REMOVED':
        if (webhookData.removedTransactions) {
          await prisma.transaction.deleteMany({
            where: {
              plaidTransactionId: { in: webhookData.removedTransactions },
            },
          });
        }
        break;

      default:
        console.warn(`Unhandled transactions webhook code: ${webhookData.webhookCode}`);
    }
  }

  private static async handleItemWebhook(webhookData: PlaidWebhookData): Promise<void> {
    switch (webhookData.webhookCode) {
      case 'ERROR':
        // Mark all accounts for this item as having errors
        await prisma.bankAccount.updateMany({
          where: { plaidItemId: webhookData.itemId },
          data: { syncStatus: 'error' },
        });
        break;

      case 'PENDING_EXPIRATION':
        // Notify that the item needs to be updated
        await prisma.bankAccount.updateMany({
          where: { plaidItemId: webhookData.itemId },
          data: { syncStatus: 'error' }, // Use error status to trigger re-authentication
        });

        // TODO: Send notification to family members
        console.log(`Item ${webhookData.itemId} requires re-authentication`);
        break;

      case 'USER_PERMISSION_REVOKED':
        // User revoked access, mark accounts as disconnected
        await prisma.bankAccount.updateMany({
          where: { plaidItemId: webhookData.itemId },
          data: { syncStatus: 'disconnected' },
        });
        break;

      case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
        // Webhook URL was successfully updated
        console.log(`Webhook updated for item ${webhookData.itemId}`);
        break;

      default:
        console.warn(`Unhandled item webhook code: ${webhookData.webhookCode}`);
    }
  }

  private static async handleAuthWebhook(webhookData: PlaidWebhookData): Promise<void> {
    // Handle authentication-related webhooks
    console.log(`Auth webhook ${webhookData.webhookCode} for item ${webhookData.itemId}`);
  }

  private static async handleIdentityWebhook(webhookData: PlaidWebhookData): Promise<void> {
    // Handle identity verification webhooks
    console.log(`Identity webhook ${webhookData.webhookCode} for item ${webhookData.itemId}`);
  }

  private static async handleAssetsWebhook(webhookData: PlaidWebhookData): Promise<void> {
    // Handle asset report webhooks
    console.log(`Assets webhook ${webhookData.webhookCode} for item ${webhookData.itemId}`);
  }

  private static async logWebhookEvent(
    webhookData: PlaidWebhookData,
    status: 'processed' | 'error',
    error?: string
  ): Promise<void> {
    // Log webhook events for debugging and monitoring
    try {
      await prisma.webhookLog.create({
        data: {
          webhookType: webhookData.webhookType,
          webhookCode: webhookData.webhookCode,
          itemId: webhookData.itemId,
          status,
          error,
          processedAt: new Date(),
          data: webhookData,
        },
      });
    } catch (err) {
      console.error('Failed to log webhook event:', err);
    }
  }

  // Utility methods for advanced Plaid features
  static async getAuthData(accessToken: string): Promise<any> {
    try {
      const request: AuthGetRequest = { access_token: accessToken };
      const response = await plaidClient.authGet(request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get auth data: ${error.message}`);
    }
  }

  static async getIdentityData(accessToken: string): Promise<any> {
    try {
      const request: IdentityGetRequest = { access_token: accessToken };
      const response = await plaidClient.identityGet(request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get identity data: ${error.message}`);
    }
  }

  static async getLiabilitiesData(accessToken: string): Promise<any> {
    try {
      const request: LiabilitiesGetRequest = { access_token: accessToken };
      const response = await plaidClient.liabilitiesGet(request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get liabilities data: ${error.message}`);
    }
  }

  static async getInvestmentsData(accessToken: string): Promise<any> {
    try {
      const request: InvestmentsGetRequest = { access_token: accessToken };
      const response = await plaidClient.investmentsGet(request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get investments data: ${error.message}`);
    }
  }
}