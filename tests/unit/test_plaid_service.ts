import { PlaidIntegrationService, PlaidWebhookData, PlaidSyncResult } from '../../backend/src/services/plaid-integration.service';
import { WebhookType } from 'plaid';
import { prisma } from '../../backend/src/lib/prisma';
import { plaidClient } from '../../backend/src/lib/plaid';

// Mock Prisma
jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: {
    bankAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Plaid client
jest.mock('../../backend/src/lib/plaid', () => ({
  plaidClient: {
    transactionsGet: jest.fn(),
    accountsGet: jest.fn(),
    institutionsGet: jest.fn(),
    itemGet: jest.fn(),
    linkTokenCreate: jest.fn(),
  },
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('PlaidIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plaid API Mocks and Test Data', () => {
    const createMockBankAccount = (overrides = {}) => ({
      id: 'bank-account-1',
      familyId: 'family-1',
      accountName: 'Test Checking',
      accountType: 'depository',
      accountSubtype: 'checking',
      currentBalance: 1000,
      availableBalance: 950,
      plaidAccessToken: 'access-token-123',
      plaidAccountId: 'account-123',
      plaidItemId: 'item-123',
      syncStatus: 'active',
      lastSyncAt: new Date(),
      deletedAt: null,
      ...overrides,
    });

    const createMockPlaidTransaction = (overrides = {}) => ({
      transaction_id: 'txn-123',
      account_id: 'account-123',
      amount: 12.34,
      date: '2024-01-15',
      name: 'Coffee Shop Purchase',
      merchant_name: 'Local Coffee',
      pending: false,
      category_id: 'category-123',
      category: ['Food and Drink', 'Restaurants'],
      account_owner: 'account_holder',
      ...overrides,
    });

    const createMockPlaidAccount = (overrides = {}) => ({
      account_id: 'account-123',
      name: 'Test Checking',
      type: 'depository',
      subtype: 'checking',
      balances: {
        current: 1000,
        available: 950,
        limit: null,
      },
      ...overrides,
    });

    const createMockPlaidInstitution = (overrides = {}) => ({
      institution_id: 'ins_123',
      name: 'Test Bank',
      products: ['transactions', 'auth'],
      country_codes: ['US'],
      url: 'https://testbank.com',
      primary_color: '#003366',
      logo: 'https://logo.url/logo.png',
      routing_numbers: ['123456789'],
      status: {
        item_logins: {
          status: 'HEALTHY',
          last_status_change: '2024-01-01T00:00:00Z',
        },
      },
      ...overrides,
    });

    it('should create valid mock data structures', () => {
      const bankAccount = createMockBankAccount();
      const plaidTransaction = createMockPlaidTransaction();
      const plaidAccount = createMockPlaidAccount();
      const plaidInstitution = createMockPlaidInstitution();

      expect(bankAccount).toHaveProperty('plaidAccessToken');
      expect(plaidTransaction).toHaveProperty('transaction_id');
      expect(plaidAccount).toHaveProperty('balances');
      expect(plaidInstitution).toHaveProperty('institution_id');
    });
  });

  describe('handleWebhook', () => {
    it('should handle transactions webhook', async () => {
      const webhookData: PlaidWebhookData = {
        webhookType: WebhookType.Transactions,
        webhookCode: 'DEFAULT_UPDATE',
        itemId: 'item-123',
        newTransactions: 5,
      };

      // Mock private method by spying on the class
      const handleTransactionsWebhookSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'handleTransactionsWebhook'
      ).mockResolvedValue(undefined);

      const logWebhookEventSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'logWebhookEvent'
      ).mockResolvedValue(undefined);

      await PlaidIntegrationService.handleWebhook(webhookData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Processing Plaid webhook: TRANSACTIONS.DEFAULT_UPDATE'
      );
      expect(handleTransactionsWebhookSpy).toHaveBeenCalledWith(webhookData);
      expect(logWebhookEventSpy).toHaveBeenCalledWith(webhookData, 'processed');
    });

    it('should handle item webhook', async () => {
      const webhookData: PlaidWebhookData = {
        webhookType: WebhookType.Item,
        webhookCode: 'ERROR',
        itemId: 'item-123',
        error: { error_code: 'ITEM_LOGIN_REQUIRED' },
      };

      const handleItemWebhookSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'handleItemWebhook'
      ).mockResolvedValue(undefined);

      const logWebhookEventSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'logWebhookEvent'
      ).mockResolvedValue(undefined);

      await PlaidIntegrationService.handleWebhook(webhookData);

      expect(handleItemWebhookSpy).toHaveBeenCalledWith(webhookData);
      expect(logWebhookEventSpy).toHaveBeenCalledWith(webhookData, 'processed');
    });

    it('should handle auth webhook', async () => {
      const webhookData: PlaidWebhookData = {
        webhookType: WebhookType.Auth,
        webhookCode: 'AUTOMATICALLY_VERIFIED',
        itemId: 'item-123',
      };

      const handleAuthWebhookSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'handleAuthWebhook'
      ).mockResolvedValue(undefined);

      await PlaidIntegrationService.handleWebhook(webhookData);

      expect(handleAuthWebhookSpy).toHaveBeenCalledWith(webhookData);
    });

    it('should handle identity webhook', async () => {
      const webhookData: PlaidWebhookData = {
        webhookType: WebhookType.Identity,
        webhookCode: 'DEFAULT_UPDATE',
        itemId: 'item-123',
      };

      const handleIdentityWebhookSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'handleIdentityWebhook'
      ).mockResolvedValue(undefined);

      await PlaidIntegrationService.handleWebhook(webhookData);

      expect(handleIdentityWebhookSpy).toHaveBeenCalledWith(webhookData);
    });

    it('should handle assets webhook', async () => {
      const webhookData: PlaidWebhookData = {
        webhookType: WebhookType.Assets,
        webhookCode: 'PRODUCT_READY',
        itemId: 'item-123',
      };

      const handleAssetsWebhookSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'handleAssetsWebhook'
      ).mockResolvedValue(undefined);

      await PlaidIntegrationService.handleWebhook(webhookData);

      expect(handleAssetsWebhookSpy).toHaveBeenCalledWith(webhookData);
    });

    it('should warn for unhandled webhook types', async () => {
      const webhookData: PlaidWebhookData = {
        webhookType: 'UNKNOWN_TYPE' as WebhookType,
        webhookCode: 'UNKNOWN_CODE',
        itemId: 'item-123',
      };

      const logWebhookEventSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'logWebhookEvent'
      ).mockResolvedValue(undefined);

      await PlaidIntegrationService.handleWebhook(webhookData);

      expect(mockConsoleWarn).toHaveBeenCalledWith('Unhandled webhook type: UNKNOWN_TYPE');
      expect(logWebhookEventSpy).toHaveBeenCalledWith(webhookData, 'processed');
    });

    it('should handle webhook processing errors', async () => {
      const webhookData: PlaidWebhookData = {
        webhookType: WebhookType.Transactions,
        webhookCode: 'DEFAULT_UPDATE',
        itemId: 'item-123',
      };

      const error = new Error('Webhook processing failed');
      jest.spyOn(PlaidIntegrationService as any, 'handleTransactionsWebhook')
        .mockRejectedValue(error);

      const logWebhookEventSpy = jest.spyOn(
        PlaidIntegrationService as any,
        'logWebhookEvent'
      ).mockResolvedValue(undefined);

      await expect(PlaidIntegrationService.handleWebhook(webhookData))
        .rejects.toThrow('Webhook processing failed');

      expect(mockConsoleError).toHaveBeenCalledWith('Error processing Plaid webhook:', error);
      expect(logWebhookEventSpy).toHaveBeenCalledWith(webhookData, 'error', 'Webhook processing failed');
    });
  });

  describe('syncAllTransactions', () => {
    it('should sync transactions for all active bank accounts', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          familyId: 'family-1',
          syncStatus: 'active',
          plaidAccessToken: 'token-1',
          deletedAt: null,
        },
        {
          id: 'account-2',
          familyId: 'family-1',
          syncStatus: 'active',
          plaidAccessToken: 'token-2',
          deletedAt: null,
        },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);

      const mockSyncResult: PlaidSyncResult = {
        bankAccountId: 'account-1',
        status: 'success',
        newTransactions: 5,
        updatedTransactions: 2,
      };

      const syncTransactionsForAccountSpy = jest.spyOn(
        PlaidIntegrationService,
        'syncTransactionsForAccount'
      ).mockResolvedValue(mockSyncResult);

      const results = await PlaidIntegrationService.syncAllTransactions('family-1');

      expect(prisma.bankAccount.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-1',
          syncStatus: { in: ['active', 'error'] },
          plaidAccessToken: { not: null },
          deletedAt: null,
        },
      });

      expect(syncTransactionsForAccountSpy).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockSyncResult);
    });

    it('should handle account sync errors gracefully', async () => {
      const mockBankAccounts = [
        { id: 'account-1', familyId: 'family-1' },
        { id: 'account-2', familyId: 'family-1' },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);

      jest.spyOn(PlaidIntegrationService, 'syncTransactionsForAccount')
        .mockResolvedValueOnce({
          bankAccountId: 'account-1',
          status: 'success',
          newTransactions: 5,
          updatedTransactions: 2,
        })
        .mockRejectedValueOnce(new Error('Sync failed for account-2'));

      const results = await PlaidIntegrationService.syncAllTransactions('family-1');

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('error');
      expect(results[1].error).toBe('Sync failed for account-2');
    });

    it('should return empty array when no accounts found', async () => {
      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue([]);

      const results = await PlaidIntegrationService.syncAllTransactions('family-1');

      expect(results).toEqual([]);
    });
  });

  describe('syncTransactionsForAccount', () => {
    it('should sync transactions for a bank account', async () => {
      const mockBankAccount = {
        id: 'account-1',
        plaidAccessToken: 'access-token-123',
        plaidAccountId: 'plaid-account-123',
      };

      const mockTransactions = [
        {
          transaction_id: 'txn-1',
          amount: 12.34,
          date: '2024-01-15',
          name: 'Coffee Shop',
          merchant_name: 'Local Coffee',
          pending: false,
          category_id: 'cat-1',
          category: ['Food and Drink'],
          account_owner: 'owner',
        },
        {
          transaction_id: 'txn-2',
          amount: 50.00,
          date: '2024-01-14',
          name: 'Grocery Store',
          pending: true,
        },
      ];

      (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue(mockBankAccount);
      (plaidClient.transactionsGet as jest.Mock).mockResolvedValue({
        data: { transactions: mockTransactions },
      });
      (prisma.transaction.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // First transaction is new
        .mockResolvedValueOnce({ id: 'existing-txn-2' }); // Second transaction exists
      (prisma.transaction.create as jest.Mock).mockResolvedValue({});
      (prisma.transaction.update as jest.Mock).mockResolvedValue({});
      (prisma.bankAccount.update as jest.Mock).mockResolvedValue({});

      const result = await PlaidIntegrationService.syncTransactionsForAccount('account-1');

      expect(result).toEqual({
        bankAccountId: 'account-1',
        status: 'success',
        newTransactions: 1,
        updatedTransactions: 1,
      });

      expect(plaidClient.transactionsGet).toHaveBeenCalledWith({
        access_token: 'access-token-123',
        start_date: expect.any(String),
        end_date: expect.any(String),
        account_ids: ['plaid-account-123'],
        count: 500,
        offset: 0,
      });

      expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.update).toHaveBeenCalledTimes(1);
      expect(prisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          lastSyncAt: expect.any(Date),
          syncStatus: 'active',
        },
      });
    });

    it('should throw error for non-existent bank account', async () => {
      (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(PlaidIntegrationService.syncTransactionsForAccount('non-existent'))
        .rejects.toThrow('Bank account not found or not connected to Plaid');
    });

    it('should throw error for bank account without Plaid token', async () => {
      (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        plaidAccessToken: null,
      });

      await expect(PlaidIntegrationService.syncTransactionsForAccount('account-1'))
        .rejects.toThrow('Bank account not found or not connected to Plaid');
    });

    it('should handle Plaid API errors and update sync status', async () => {
      const mockBankAccount = {
        id: 'account-1',
        plaidAccessToken: 'access-token-123',
        plaidAccountId: 'plaid-account-123',
      };

      (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue(mockBankAccount);
      (plaidClient.transactionsGet as jest.Mock).mockRejectedValue(new Error('Plaid API error'));
      (prisma.bankAccount.update as jest.Mock).mockResolvedValue({});

      await expect(PlaidIntegrationService.syncTransactionsForAccount('account-1'))
        .rejects.toThrow('Plaid API error');

      expect(prisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { syncStatus: 'error' },
      });
    });
  });

  describe('getAccountBalances', () => {
    it('should get balances for all active bank accounts', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          plaidAccessToken: 'token-1',
          plaidAccountId: 'plaid-account-1',
        },
        {
          id: 'account-2',
          plaidAccessToken: 'token-2',
          plaidAccountId: 'plaid-account-2',
        },
      ];

      const mockPlaidAccount = {
        account_id: 'plaid-account-1',
        balances: {
          current: 1000,
          available: 950,
          limit: 5000,
        },
      };

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.accountsGet as jest.Mock).mockResolvedValue({
        data: { accounts: [mockPlaidAccount] },
      });
      (prisma.bankAccount.update as jest.Mock).mockResolvedValue({});

      const balances = await PlaidIntegrationService.getAccountBalances('family-1');

      expect(prisma.bankAccount.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-1',
          plaidAccessToken: { not: null },
          syncStatus: 'active',
          deletedAt: null,
        },
      });

      expect(balances).toHaveLength(2);
      expect(balances[0]).toEqual({
        accountId: 'account-1',
        plaidAccountId: 'plaid-account-1',
        current: 1000,
        available: 950,
        limit: 5000,
        lastUpdated: expect.any(Date),
      });

      expect(prisma.bankAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: {
          currentBalance: 1000,
          availableBalance: 950,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle accounts with missing balance data', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          plaidAccessToken: 'token-1',
          plaidAccountId: 'plaid-account-1',
        },
      ];

      const mockPlaidAccount = {
        account_id: 'plaid-account-1',
        balances: {
          current: null,
          available: null,
          limit: null,
        },
      };

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.accountsGet as jest.Mock).mockResolvedValue({
        data: { accounts: [mockPlaidAccount] },
      });
      (prisma.bankAccount.update as jest.Mock).mockResolvedValue({});

      const balances = await PlaidIntegrationService.getAccountBalances('family-1');

      expect(balances[0]).toEqual({
        accountId: 'account-1',
        plaidAccountId: 'plaid-account-1',
        current: 0,
        available: 0,
        limit: undefined,
        lastUpdated: expect.any(Date),
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          plaidAccessToken: 'token-1',
          plaidAccountId: 'plaid-account-1',
        },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.accountsGet as jest.Mock).mockRejectedValue(new Error('API error'));

      const balances = await PlaidIntegrationService.getAccountBalances('family-1');

      expect(balances).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to get balance for account account-1:',
        expect.any(Error)
      );
    });
  });

  describe('getInstitutionInfo', () => {
    it('should return institution information', async () => {
      const mockInstitution = {
        institution_id: 'ins_123',
        name: 'Test Bank',
        products: ['transactions', 'auth'],
        country_codes: ['US'],
        url: 'https://testbank.com',
        primary_color: '#003366',
        logo: 'https://logo.url/logo.png',
        routing_numbers: ['123456789'],
        status: {
          item_logins: {
            status: 'HEALTHY',
            last_status_change: '2024-01-01T00:00:00Z',
          },
        },
      };

      (plaidClient.institutionsGet as jest.Mock).mockResolvedValue({
        data: { institutions: [mockInstitution] },
      });

      const result = await PlaidIntegrationService.getInstitutionInfo('ins_123');

      expect(plaidClient.institutionsGet).toHaveBeenCalledWith({
        institution_ids: ['ins_123'],
        country_codes: ['US'],
        options: {
          include_optional_metadata: true,
          include_status: true,
        },
      });

      expect(result).toEqual({
        institutionId: 'ins_123',
        name: 'Test Bank',
        products: ['transactions', 'auth'],
        countryCodes: ['US'],
        url: 'https://testbank.com',
        primaryColor: '#003366',
        logo: 'https://logo.url/logo.png',
        routingNumbers: ['123456789'],
        status: {
          itemLogins: {
            status: 'HEALTHY',
            lastStatusChange: '2024-01-01T00:00:00Z',
          },
        },
      });
    });

    it('should return null when institution not found', async () => {
      (plaidClient.institutionsGet as jest.Mock).mockResolvedValue({
        data: { institutions: [] },
      });

      const result = await PlaidIntegrationService.getInstitutionInfo('non-existent');

      expect(result).toBeNull();
    });

    it('should handle API errors and return null', async () => {
      (plaidClient.institutionsGet as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await PlaidIntegrationService.getInstitutionInfo('ins_123');

      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching institution info:',
        expect.any(Error)
      );
    });

    it('should handle optional fields gracefully', async () => {
      const mockInstitution = {
        institution_id: 'ins_123',
        name: 'Minimal Bank',
        products: ['transactions'],
        country_codes: ['US'],
        routing_numbers: [],
        status: {
          item_logins: {
            status: 'HEALTHY',
          },
        },
      };

      (plaidClient.institutionsGet as jest.Mock).mockResolvedValue({
        data: { institutions: [mockInstitution] },
      });

      const result = await PlaidIntegrationService.getInstitutionInfo('ins_123');

      expect(result).toEqual({
        institutionId: 'ins_123',
        name: 'Minimal Bank',
        products: ['transactions'],
        countryCodes: ['US'],
        url: undefined,
        primaryColor: undefined,
        logo: undefined,
        routingNumbers: [],
        status: {
          itemLogins: {
            status: 'HEALTHY',
            lastStatusChange: expect.any(String),
          },
        },
      });
    });
  });

  describe('getItemStatus', () => {
    it('should get status for all items in family', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          accountName: 'Checking',
          accountType: 'depository',
          accountSubtype: 'checking',
          currentBalance: 1000,
          plaidAccessToken: 'token-1',
          plaidItemId: 'item-1',
        },
      ];

      const mockItem = {
        item_id: 'item-1',
        institution_id: 'ins_123',
        error: null,
      };

      const mockAccounts = [
        {
          account_id: 'plaid-account-1',
          name: 'Checking Account',
          type: 'depository',
          subtype: 'checking',
        },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.itemGet as jest.Mock).mockResolvedValue({
        data: { item: mockItem },
      });
      (plaidClient.accountsGet as jest.Mock).mockResolvedValue({
        data: { accounts: mockAccounts },
      });

      // Mock the getInstitutionInfo method
      jest.spyOn(PlaidIntegrationService, 'getInstitutionInfo')
        .mockResolvedValue({
          institutionId: 'ins_123',
          name: 'Test Bank',
          products: ['transactions'],
          countryCodes: ['US'],
          routingNumbers: [],
          status: {
            itemLogins: {
              status: 'HEALTHY',
              lastStatusChange: '2024-01-01T00:00:00Z',
            },
          },
        });

      const statuses = await PlaidIntegrationService.getItemStatus('family-1');

      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toEqual({
        itemId: 'item-1',
        institutionId: 'ins_123',
        institutionName: 'Test Bank',
        status: 'good',
        lastUpdate: expect.any(Date),
        error: undefined,
        accounts: [{
          accountId: 'account-1',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          balance: 1000,
        }],
      });
    });

    it('should handle item errors correctly', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          accountName: 'Checking',
          accountType: 'depository',
          accountSubtype: 'checking',
          currentBalance: 1000,
          plaidAccessToken: 'token-1',
          plaidItemId: 'item-1',
        },
      ];

      const mockItem = {
        item_id: 'item-1',
        institution_id: 'ins_123',
        error: {
          error_type: 'ITEM_ERROR',
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'User login required',
          display_message: 'Please log in to your bank account',
        },
      };

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.itemGet as jest.Mock).mockResolvedValue({
        data: { item: mockItem },
      });
      (plaidClient.accountsGet as jest.Mock).mockResolvedValue({
        data: { accounts: [] },
      });

      jest.spyOn(PlaidIntegrationService, 'getInstitutionInfo')
        .mockResolvedValue({
          institutionId: 'ins_123',
          name: 'Test Bank',
          products: [],
          countryCodes: ['US'],
          routingNumbers: [],
          status: {
            itemLogins: {
              status: 'DEGRADED',
              lastStatusChange: '2024-01-01T00:00:00Z',
            },
          },
        });

      const statuses = await PlaidIntegrationService.getItemStatus('family-1');

      expect(statuses[0].status).toBe('requires_user_action');
      expect(statuses[0].error).toEqual({
        errorType: 'ITEM_ERROR',
        errorCode: 'ITEM_LOGIN_REQUIRED',
        displayMessage: 'Please log in to your bank account',
      });
    });

    it('should group multiple accounts by item', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          accountName: 'Checking',
          accountType: 'depository',
          accountSubtype: 'checking',
          currentBalance: 1000,
          plaidAccessToken: 'token-1',
          plaidItemId: 'item-1',
        },
        {
          id: 'account-2',
          accountName: 'Savings',
          accountType: 'depository',
          accountSubtype: 'savings',
          currentBalance: 5000,
          plaidAccessToken: 'token-1',
          plaidItemId: 'item-1',
        },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.itemGet as jest.Mock).mockResolvedValue({
        data: { item: { item_id: 'item-1', institution_id: 'ins_123', error: null } },
      });
      (plaidClient.accountsGet as jest.Mock).mockResolvedValue({
        data: { accounts: [] },
      });

      jest.spyOn(PlaidIntegrationService, 'getInstitutionInfo')
        .mockResolvedValue({ institutionId: 'ins_123', name: 'Test Bank' } as any);

      const statuses = await PlaidIntegrationService.getItemStatus('family-1');

      expect(statuses).toHaveLength(1);
      expect(statuses[0].accounts).toHaveLength(2);
      expect(statuses[0].accounts[0].name).toBe('Checking');
      expect(statuses[0].accounts[1].name).toBe('Savings');
    });

    it('should handle API errors gracefully', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          plaidAccessToken: 'token-1',
          plaidItemId: 'item-1',
        },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.itemGet as jest.Mock).mockRejectedValue(new Error('API error'));

      const statuses = await PlaidIntegrationService.getItemStatus('family-1');

      expect(statuses).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to get item status for account account-1:',
        expect.any(Error)
      );
    });
  });

  describe('createLinkTokenForUpdate', () => {
    it('should create link token for item update', async () => {
      const mockBankAccount = {
        plaidAccessToken: 'access-token-123',
      };

      (prisma.bankAccount.findFirst as jest.Mock).mockResolvedValue(mockBankAccount);
      (plaidClient.linkTokenCreate as jest.Mock).mockResolvedValue({
        data: { link_token: 'link-token-123' },
      });

      const linkToken = await PlaidIntegrationService.createLinkTokenForUpdate('item-123', 'user-123');

      expect(prisma.bankAccount.findFirst).toHaveBeenCalledWith({
        where: { plaidItemId: 'item-123' },
      });

      expect(plaidClient.linkTokenCreate).toHaveBeenCalledWith({
        products: [],
        client_name: 'Family Finance',
        country_codes: ['US'],
        language: 'en',
        user: { client_user_id: 'user-123' },
        access_token: 'access-token-123',
        update: { account_selection_enabled: true },
      });

      expect(linkToken).toBe('link-token-123');
    });

    it('should throw error when access token not found', async () => {
      (prisma.bankAccount.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        PlaidIntegrationService.createLinkTokenForUpdate('item-123', 'user-123')
      ).rejects.toThrow('Access token not found for item');
    });

    it('should throw error when bank account has no access token', async () => {
      (prisma.bankAccount.findFirst as jest.Mock).mockResolvedValue({
        plaidAccessToken: null,
      });

      await expect(
        PlaidIntegrationService.createLinkTokenForUpdate('item-123', 'user-123')
      ).rejects.toThrow('Access token not found for item');
    });

    it('should handle Plaid API errors', async () => {
      (prisma.bankAccount.findFirst as jest.Mock).mockResolvedValue({
        plaidAccessToken: 'access-token-123',
      });
      (plaidClient.linkTokenCreate as jest.Mock).mockRejectedValue(
        new Error('Invalid access token')
      );

      await expect(
        PlaidIntegrationService.createLinkTokenForUpdate('item-123', 'user-123')
      ).rejects.toThrow('Failed to create link token for update: Invalid access token');
    });
  });

  describe('refreshItemData', () => {
    it('should refresh item data successfully', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          plaidItemId: 'item-123',
          plaidAccessToken: 'access-token-123',
          plaidAccountId: 'plaid-account-1',
        },
        {
          id: 'account-2',
          plaidItemId: 'item-123',
          plaidAccessToken: 'access-token-123',
          plaidAccountId: 'plaid-account-2',
        },
      ];

      const mockPlaidAccounts = [
        {
          account_id: 'plaid-account-1',
          balances: { current: 1000, available: 950 },
        },
        {
          account_id: 'plaid-account-2',
          balances: { current: 5000, available: 4500 },
        },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.accountsGet as jest.Mock).mockResolvedValue({
        data: { accounts: mockPlaidAccounts },
      });
      (prisma.bankAccount.update as jest.Mock).mockResolvedValue({});

      const syncTransactionsForAccountSpy = jest.spyOn(
        PlaidIntegrationService,
        'syncTransactionsForAccount'
      ).mockResolvedValue({
        bankAccountId: 'account-1',
        status: 'success',
        newTransactions: 0,
        updatedTransactions: 0,
      });

      await PlaidIntegrationService.refreshItemData('item-123');

      expect(prisma.bankAccount.findMany).toHaveBeenCalledWith({
        where: { plaidItemId: 'item-123' },
      });

      expect(plaidClient.accountsGet).toHaveBeenCalledWith({
        access_token: 'access-token-123',
      });

      expect(prisma.bankAccount.update).toHaveBeenCalledTimes(2);
      expect(syncTransactionsForAccountSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw error when no accounts found', async () => {
      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue([]);

      await expect(PlaidIntegrationService.refreshItemData('item-123'))
        .rejects.toThrow('No accounts found for item');
    });

    it('should throw error when no access token found', async () => {
      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue([
        { id: 'account-1', plaidAccessToken: null },
      ]);

      await expect(PlaidIntegrationService.refreshItemData('item-123'))
        .rejects.toThrow('No access token found for item');
    });

    it('should handle errors and update account status', async () => {
      const mockBankAccounts = [
        {
          id: 'account-1',
          plaidItemId: 'item-123',
          plaidAccessToken: 'access-token-123',
        },
      ];

      (prisma.bankAccount.findMany as jest.Mock).mockResolvedValue(mockBankAccounts);
      (plaidClient.accountsGet as jest.Mock).mockRejectedValue(new Error('API error'));
      (prisma.bankAccount.updateMany as jest.Mock).mockResolvedValue({});

      await expect(PlaidIntegrationService.refreshItemData('item-123'))
        .rejects.toThrow('API error');

      expect(prisma.bankAccount.updateMany).toHaveBeenCalledWith({
        where: { plaidItemId: 'item-123' },
        data: { syncStatus: 'error' },
      });
    });
  });

  describe('Type Definitions and Interfaces', () => {
    it('should have correct PlaidWebhookData type structure', () => {
      const webhookData: PlaidWebhookData = {
        webhookType: WebhookType.Transactions,
        webhookCode: 'DEFAULT_UPDATE',
        itemId: 'item-123',
        newTransactions: 5,
        removedTransactions: ['txn-1', 'txn-2'],
        consentExpirationTime: '2024-12-31T23:59:59Z',
        error: { error_code: 'ITEM_ERROR' },
      };

      expect(webhookData.webhookType).toBe(WebhookType.Transactions);
      expect(webhookData.newTransactions).toBe(5);
      expect(webhookData.removedTransactions).toHaveLength(2);
    });

    it('should have correct PlaidSyncResult type structure', () => {
      const syncResult: PlaidSyncResult = {
        bankAccountId: 'account-1',
        status: 'success',
        newTransactions: 10,
        updatedTransactions: 5,
      };

      expect(syncResult.status).toBe('success');
      expect(syncResult.newTransactions).toBe(10);

      const errorResult: PlaidSyncResult = {
        bankAccountId: 'account-2',
        status: 'error',
        newTransactions: 0,
        updatedTransactions: 0,
        error: 'Sync failed',
      };

      expect(errorResult.status).toBe('error');
      expect(errorResult.error).toBeDefined();
    });

    it('should have correct PlaidInstitutionData type structure', () => {
      const institutionData: PlaidInstitutionData = {
        institutionId: 'ins_123',
        name: 'Test Bank',
        products: ['transactions', 'auth'],
        countryCodes: ['US'],
        url: 'https://testbank.com',
        primaryColor: '#003366',
        logo: 'https://logo.url',
        routingNumbers: ['123456789'],
        status: {
          itemLogins: {
            status: 'HEALTHY',
            lastStatusChange: '2024-01-01T00:00:00Z',
          },
        },
      };

      expect(institutionData.institutionId).toBe('ins_123');
      expect(institutionData.products).toContain('transactions');
      expect(institutionData.status.itemLogins.status).toBe('HEALTHY');
    });

    it('should have correct PlaidAccountBalance type structure', () => {
      const accountBalance: PlaidAccountBalance = {
        accountId: 'account-1',
        plaidAccountId: 'plaid-account-1',
        current: 1000.50,
        available: 950.25,
        limit: 5000,
        lastUpdated: new Date(),
      };

      expect(accountBalance.current).toBe(1000.50);
      expect(accountBalance.available).toBe(950.25);
      expect(accountBalance.limit).toBe(5000);
      expect(accountBalance.lastUpdated).toBeInstanceOf(Date);
    });

    it('should have correct PlaidItemStatus type structure', () => {
      const itemStatus: PlaidItemStatus = {
        itemId: 'item-123',
        institutionId: 'ins_123',
        institutionName: 'Test Bank',
        status: 'requires_user_action',
        lastUpdate: new Date(),
        error: {
          errorType: 'ITEM_ERROR',
          errorCode: 'ITEM_LOGIN_REQUIRED',
          displayMessage: 'Please log in',
        },
        accounts: [
          {
            accountId: 'account-1',
            name: 'Checking',
            type: 'depository',
            subtype: 'checking',
            balance: 1000,
          },
        ],
      };

      expect(itemStatus.status).toBe('requires_user_action');
      expect(itemStatus.error?.errorCode).toBe('ITEM_LOGIN_REQUIRED');
      expect(itemStatus.accounts).toHaveLength(1);
      expect(itemStatus.accounts[0].name).toBe('Checking');
    });
  });
});