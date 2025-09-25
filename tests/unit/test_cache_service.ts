import { CacheService, CacheOptions, CacheStats } from '../../backend/src/services/cache.service';

// Mock Prisma
const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Add prisma to global scope
global.prisma = mockPrisma as any;

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.prisma;
  });

  describe('set', () => {
    beforeEach(() => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
    });

    it('should set cache entry with default TTL', async () => {
      const testValue = { test: 'data' };

      await CacheService.set('test-key', testValue);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.any(Object), // Template literal query
        'test-key',
        'cache-entry',
        expect.stringContaining('"value":"{\\"test\\":\\"data\\"}'),
        'internal',
        'cache-service',
        expect.any(Date),
        expect.stringContaining('"value":"{\\"test\\":\\"data\\"}'),
        expect.any(Date)
      );
    });

    it('should set cache entry with custom TTL', async () => {
      const testValue = { test: 'data' };
      const options: CacheOptions = { ttl: 1800 };

      await CacheService.set('test-key', testValue, options);

      const expectedExpiration = new Date(Date.now() + 1800 * 1000);
      const actualCall = mockPrisma.$executeRaw.mock.calls[0];
      const actualExpiration = actualCall[6]; // expiresAt parameter

      // Allow 1 second tolerance
      expect(Math.abs(actualExpiration.getTime() - expectedExpiration.getTime())).toBeLessThan(1000);
    });

    it('should respect maximum TTL limit', async () => {
      const testValue = { test: 'data' };
      const options: CacheOptions = { ttl: 86400 * 30 }; // 30 days, exceeds MAX_TTL

      await CacheService.set('test-key', testValue, options);

      const actualCall = mockPrisma.$executeRaw.mock.calls[0];
      const actualExpiration = actualCall[6];
      const maxExpectedTime = Date.now() + 86400 * 7 * 1000 + 1000; // MAX_TTL + 1 second tolerance

      expect(actualExpiration.getTime()).toBeLessThan(maxExpectedTime);
    });

    it('should include family ID and tags in cache data', async () => {
      const testValue = { test: 'data' };
      const options: CacheOptions = {
        ttl: 1800,
        familyId: 'family-123',
        tags: ['user-data', 'session'],
      };

      await CacheService.set('test-key', testValue, options);

      const actualCall = mockPrisma.$executeRaw.mock.calls[0];
      const cacheDataStr = actualCall[3];

      expect(cacheDataStr).toContain('"familyId":"family-123"');
      expect(cacheDataStr).toContain('"tags":"user-data,session"');
    });

    it('should handle null tags', async () => {
      const testValue = { test: 'data' };
      const options: CacheOptions = { familyId: 'family-123' };

      await CacheService.set('test-key', testValue, options);

      const actualCall = mockPrisma.$executeRaw.mock.calls[0];
      const cacheDataStr = actualCall[3];
      const cacheData = JSON.parse(cacheDataStr);

      expect(cacheData.tags).toBeNull();
    });

    it('should serialize complex objects', async () => {
      const complexValue = {
        nested: {
          array: [1, 2, 3],
          boolean: true,
          nullValue: null,
        },
        date: new Date('2024-01-01').toISOString(),
      };

      await CacheService.set('complex-key', complexValue);

      const actualCall = mockPrisma.$executeRaw.mock.calls[0];
      const cacheDataStr = actualCall[3];
      const cacheData = JSON.parse(cacheDataStr);
      const storedValue = JSON.parse(cacheData.value);

      expect(storedValue).toEqual(complexValue);
    });
  });

  describe('get', () => {
    it('should retrieve cached value', async () => {
      const testValue = { test: 'data' };
      const cacheData = {
        key: 'test-key',
        value: JSON.stringify(testValue),
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockPrisma.$queryRaw.mockResolvedValue([{
        token: JSON.stringify(cacheData),
        expiresAt: cacheData.expiresAt,
      }]);

      const result = await CacheService.get('test-key');

      expect(result).toEqual(testValue);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'test-key'
      );
    });

    it('should return null when key not found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await CacheService.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should return null when key is expired', async () => {
      // The query already filters out expired entries, so this tests the DB query logic
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await CacheService.get('expired-key');

      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{
        token: 'invalid-json',
        expiresAt: new Date(),
      }]);

      const result = await CacheService.get('corrupted-key');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Cache get error:', expect.any(Error));
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await CacheService.get('test-key');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Cache get error:', expect.any(Error));
    });

    it('should handle nested JSON parsing', async () => {
      const complexValue = { nested: { data: 'test' }, array: [1, 2, 3] };
      const cacheData = {
        value: JSON.stringify(complexValue),
      };

      mockPrisma.$queryRaw.mockResolvedValue([{
        token: JSON.stringify(cacheData),
        expiresAt: new Date(Date.now() + 3600000),
      }]);

      const result = await CacheService.get('complex-key');

      expect(result).toEqual(complexValue);
    });
  });

  describe('has', () => {
    it('should return true when key exists and is not expired', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(1) }]);

      const result = await CacheService.has('existing-key');

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'existing-key'
      );
    });

    it('should return false when key does not exist', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await CacheService.has('nonexistent-key');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      const result = await CacheService.has('test-key');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Cache has error:', expect.any(Error));
    });

    it('should handle BigInt count values', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(3) }]);

      const result = await CacheService.has('test-key');

      expect(result).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete existing cache entry', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const result = await CacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.any(Object),
        'test-key'
      );
    });

    it('should return false when key does not exist', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0);

      const result = await CacheService.delete('nonexistent-key');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Delete failed'));

      const result = await CacheService.delete('test-key');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Cache delete error:', expect.any(Error));
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple keys', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(3);

      const result = await CacheService.deleteMany(['key1', 'key2', 'key3']);

      expect(result).toBe(3);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.any(Object),
        ['key1', 'key2', 'key3']
      );
    });

    it('should return 0 for empty keys array', async () => {
      const result = await CacheService.deleteMany([]);

      expect(result).toBe(0);
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Delete many failed'));

      const result = await CacheService.deleteMany(['key1', 'key2']);

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Cache deleteMany error:', expect.any(Error));
    });
  });

  describe('deleteByFamily', () => {
    it('should delete entries by family ID', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(5);

      const result = await CacheService.deleteByFamily('family-123');

      expect(result).toBe(5);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Delete by family failed'));

      const result = await CacheService.deleteByFamily('family-123');

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Cache deleteByFamily error:', expect.any(Error));
    });
  });

  describe('deleteByTag', () => {
    it('should delete entries by tag', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(3);

      const result = await CacheService.deleteByTag('user-session');

      expect(result).toBe(3);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Delete by tag failed'));

      const result = await CacheService.deleteByTag('user-session');

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Cache deleteByTag error:', expect.any(Error));
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(10);

      const result = await CacheService.clear();

      expect(result).toBe(10);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Clear failed'));

      const result = await CacheService.clear();

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Cache clear error:', expect.any(Error));
    });
  });

  describe('getOrSet', () => {
    beforeEach(() => {
      jest.spyOn(CacheService, 'get');
      jest.spyOn(CacheService, 'set');
    });

    it('should return cached value when key exists', async () => {
      const cachedValue = { cached: true };
      (CacheService.get as jest.Mock).mockResolvedValue(cachedValue);

      const factory = jest.fn().mockResolvedValue({ fresh: true });
      const result = await CacheService.getOrSet('test-key', factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
      expect(CacheService.set).not.toHaveBeenCalled();
    });

    it('should call factory and set value when key does not exist', async () => {
      const freshValue = { fresh: true };
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue(freshValue);
      const result = await CacheService.getOrSet('test-key', factory, { ttl: 1800 });

      expect(result).toEqual(freshValue);
      expect(factory).toHaveBeenCalled();
      expect(CacheService.set).toHaveBeenCalledWith('test-key', freshValue, { ttl: 1800 });
    });

    it('should handle factory errors', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      const factory = jest.fn().mockRejectedValue(new Error('Factory failed'));

      await expect(CacheService.getOrSet('test-key', factory)).rejects.toThrow('Factory failed');

      expect(CacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('increment', () => {
    beforeEach(() => {
      jest.spyOn(CacheService, 'get');
      jest.spyOn(CacheService, 'set');
    });

    it('should increment existing numeric value', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(5);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await CacheService.increment('counter-key', 3);

      expect(result).toBe(8);
      expect(CacheService.set).toHaveBeenCalledWith('counter-key', 8);
    });

    it('should initialize counter when key does not exist', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await CacheService.increment('new-counter');

      expect(result).toBe(1);
      expect(CacheService.set).toHaveBeenCalledWith('new-counter', 1);
    });

    it('should use default increment amount', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(10);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await CacheService.increment('counter-key');

      expect(result).toBe(11);
      expect(CacheService.set).toHaveBeenCalledWith('counter-key', 11);
    });
  });

  describe('decrement', () => {
    beforeEach(() => {
      jest.spyOn(CacheService, 'increment');
    });

    it('should call increment with negative amount', async () => {
      (CacheService.increment as jest.Mock).mockResolvedValue(7);

      const result = await CacheService.decrement('counter-key', 3);

      expect(result).toBe(7);
      expect(CacheService.increment).toHaveBeenCalledWith('counter-key', -3);
    });

    it('should use default decrement amount', async () => {
      (CacheService.increment as jest.Mock).mockResolvedValue(9);

      const result = await CacheService.decrement('counter-key');

      expect(result).toBe(9);
      expect(CacheService.increment).toHaveBeenCalledWith('counter-key', -1);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockResults = [{
        total: BigInt(10),
        expired: BigInt(2),
        oldest: new Date('2024-01-01'),
        newest: new Date('2024-01-02'),
        token: JSON.stringify({
          familyId: 'family-1',
          tags: 'user-session,data',
        }) + '|||' + JSON.stringify({
          familyId: 'family-2',
          tags: 'reports',
        }),
      }];

      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        totalEntries: 10,
        expiredEntries: 2,
        familyBreakdown: {
          'family-1': 1,
          'family-2': 1,
        },
        tagBreakdown: {
          'user-session': 1,
          'data': 1,
          'reports': 1,
        },
        oldestEntry: new Date('2024-01-01'),
        newestEntry: new Date('2024-01-02'),
      });
    });

    it('should handle empty results', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{
        total: BigInt(0),
        expired: BigInt(0),
        oldest: null,
        newest: null,
        token: null,
      }]);

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        totalEntries: 0,
        expiredEntries: 0,
        familyBreakdown: {},
        tagBreakdown: {},
        oldestEntry: null,
        newestEntry: null,
      });
    });

    it('should handle invalid token data gracefully', async () => {
      const mockResults = [{
        total: BigInt(2),
        expired: BigInt(0),
        oldest: new Date('2024-01-01'),
        newest: new Date('2024-01-02'),
        token: 'invalid-json|||{"familyId":"family-1"}',
      }];

      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const stats = await CacheService.getStats();

      expect(stats.familyBreakdown).toEqual({ 'family-1': 1 });
      expect(stats.totalEntries).toBe(2);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Stats query failed'));

      const stats = await CacheService.getStats();

      expect(stats).toEqual({
        totalEntries: 0,
        expiredEntries: 0,
        familyBreakdown: {},
        tagBreakdown: {},
      });
      expect(console.error).toHaveBeenCalledWith('Cache getStats error:', expect.any(Error));
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired entries', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(5);

      const result = await CacheService.cleanup();

      expect(result).toBe(5);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Cleanup failed'));

      const result = await CacheService.cleanup();

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Cache cleanup error:', expect.any(Error));
    });
  });

  describe('getAllKeys', () => {
    it('should return all cache keys', async () => {
      const mockResults = [
        { id: 'key1' },
        { id: 'key2' },
        { id: 'key3' },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const keys = await CacheService.getAllKeys();

      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should filter by family ID', async () => {
      const mockResults = [{ id: 'family-key1' }, { id: 'family-key2' }];

      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      const keys = await CacheService.getAllKeys('family-123');

      expect(keys).toEqual(['family-key1', 'family-key2']);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Query failed'));

      const keys = await CacheService.getAllKeys();

      expect(keys).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Cache getAllKeys error:', expect.any(Error));
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      jest.spyOn(CacheService, 'set');
    });

    describe('cacheUserSession', () => {
      it('should cache user session data', async () => {
        const sessionData = { userId: 'user-123', permissions: ['read'] };

        await CacheService.cacheUserSession('user-123', sessionData, 7200);

        expect(CacheService.set).toHaveBeenCalledWith(
          'user:session:user-123',
          sessionData,
          {
            ttl: 7200,
            tags: ['user-session'],
          }
        );
      });

      it('should use default TTL when not specified', async () => {
        const sessionData = { userId: 'user-123' };

        await CacheService.cacheUserSession('user-123', sessionData);

        expect(CacheService.set).toHaveBeenCalledWith(
          'user:session:user-123',
          sessionData,
          {
            ttl: 3600,
            tags: ['user-session'],
          }
        );
      });
    });

    describe('cacheFamilyData', () => {
      it('should cache family data', async () => {
        const familyData = { members: ['user1', 'user2'] };

        await CacheService.cacheFamilyData('family-123', 'members', familyData, 900);

        expect(CacheService.set).toHaveBeenCalledWith(
          'family:family-123:members',
          familyData,
          {
            ttl: 900,
            familyId: 'family-123',
            tags: ['family-data'],
          }
        );
      });

      it('should use default TTL when not specified', async () => {
        const familyData = { settings: {} };

        await CacheService.cacheFamilyData('family-123', 'settings', familyData);

        expect(CacheService.set).toHaveBeenCalledWith(
          'family:family-123:settings',
          familyData,
          {
            ttl: 1800,
            familyId: 'family-123',
            tags: ['family-data'],
          }
        );
      });
    });

    describe('cacheReport', () => {
      it('should cache report data with timestamp', async () => {
        const reportData = { totalIncome: 5000, totalExpenses: 3000 };
        const mockTimestamp = 1640995200000;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

        await CacheService.cacheReport('family-123', 'cash-flow', reportData, 600);

        expect(CacheService.set).toHaveBeenCalledWith(
          `report:family-123:cash-flow:${mockTimestamp}`,
          reportData,
          {
            ttl: 600,
            familyId: 'family-123',
            tags: ['reports', 'cash-flow'],
          }
        );

        jest.restoreAllMocks();
      });

      it('should use default TTL when not specified', async () => {
        const reportData = { data: 'test' };

        await CacheService.cacheReport('family-123', 'budget-performance', reportData);

        expect(CacheService.set).toHaveBeenCalledWith(
          expect.stringContaining('report:family-123:budget-performance:'),
          reportData,
          {
            ttl: 900,
            familyId: 'family-123',
            tags: ['reports', 'budget-performance'],
          }
        );
      });
    });

    describe('cacheApiResponse', () => {
      it('should cache API response', async () => {
        const endpoint = 'transactions';
        const params = { familyId: 'family-123', limit: 50 };
        const response = { data: [{ id: 'txn-1' }] };

        await CacheService.cacheApiResponse(endpoint, params, response, 180);

        expect(CacheService.set).toHaveBeenCalledWith(
          `api:transactions:${JSON.stringify(params)}`,
          response,
          {
            ttl: 180,
            tags: ['api-response'],
          }
        );
      });

      it('should use default TTL when not specified', async () => {
        const endpoint = 'payments';
        const params = { status: 'due' };
        const response = { data: [] };

        await CacheService.cacheApiResponse(endpoint, params, response);

        expect(CacheService.set).toHaveBeenCalledWith(
          `api:payments:${JSON.stringify(params)}`,
          response,
          {
            ttl: 300,
            tags: ['api-response'],
          }
        );
      });
    });
  });

  describe('startCleanupScheduler', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(CacheService, 'cleanup');
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllTimers();
    });

    it('should start periodic cleanup', () => {
      (CacheService.cleanup as jest.Mock).mockResolvedValue(3);

      CacheService.startCleanupScheduler();

      // Fast-forward time to trigger cleanup
      jest.advanceTimersByTime(300 * 1000); // 5 minutes

      expect(CacheService.cleanup).toHaveBeenCalled();
    });

    it('should log successful cleanup', async () => {
      (CacheService.cleanup as jest.Mock).mockResolvedValue(5);

      CacheService.startCleanupScheduler();

      jest.advanceTimersByTime(300 * 1000);

      // Wait for the async cleanup to complete
      await jest.runAllTimersAsync();

      expect(console.log).toHaveBeenCalledWith('Cleaned up 5 expired cache entries');
    });

    it('should handle cleanup errors', async () => {
      (CacheService.cleanup as jest.Mock).mockRejectedValue(new Error('Cleanup failed'));

      CacheService.startCleanupScheduler();

      jest.advanceTimersByTime(300 * 1000);

      await jest.runAllTimersAsync();

      expect(console.error).toHaveBeenCalledWith('Scheduled cache cleanup failed:', expect.any(Error));
    });

    it('should not log when no entries cleaned', async () => {
      (CacheService.cleanup as jest.Mock).mockResolvedValue(0);

      CacheService.startCleanupScheduler();

      jest.advanceTimersByTime(300 * 1000);

      await jest.runAllTimersAsync();

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      jest.spyOn(CacheService, 'getStats');
      jest.spyOn(CacheService, 'set');
      jest.spyOn(CacheService, 'get');
      jest.spyOn(CacheService, 'delete');
    });

    it('should return healthy status', async () => {
      const mockStats: CacheStats = {
        totalEntries: 100,
        expiredEntries: 10,
        familyBreakdown: {},
        tagBreakdown: {},
      };

      (CacheService.getStats as jest.Mock).mockResolvedValue(mockStats);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);
      (CacheService.get as jest.Mock).mockResolvedValue({ test: true });
      (CacheService.delete as jest.Mock).mockResolvedValue(true);

      const health = await CacheService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.stats).toEqual(mockStats);
      expect(health.message).toBe('Cache is operating normally');
    });

    it('should return degraded status for high expired ratio', async () => {
      const mockStats: CacheStats = {
        totalEntries: 100,
        expiredEntries: 60, // 60% expired
        familyBreakdown: {},
        tagBreakdown: {},
      };

      (CacheService.getStats as jest.Mock).mockResolvedValue(mockStats);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);
      (CacheService.get as jest.Mock).mockResolvedValue({ test: true });
      (CacheService.delete as jest.Mock).mockResolvedValue(true);

      const health = await CacheService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.message).toContain('High ratio of expired entries: 60.0%');
    });

    it('should return unhealthy status when set/get test fails', async () => {
      const mockStats: CacheStats = {
        totalEntries: 10,
        expiredEntries: 1,
        familyBreakdown: {},
        tagBreakdown: {},
      };

      (CacheService.getStats as jest.Mock).mockResolvedValue(mockStats);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);
      (CacheService.get as jest.Mock).mockResolvedValue({ different: 'data' }); // Wrong data
      (CacheService.delete as jest.Mock).mockResolvedValue(true);

      const health = await CacheService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.message).toBe('Cache set/get test failed');
    });

    it('should return unhealthy status on error', async () => {
      (CacheService.getStats as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const health = await CacheService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.message).toBe('Cache health check failed: Database connection failed');
      expect(health.stats).toEqual({
        totalEntries: 0,
        expiredEntries: 0,
        familyBreakdown: {},
        tagBreakdown: {},
      });
    });

    it('should handle zero total entries correctly', async () => {
      const mockStats: CacheStats = {
        totalEntries: 0,
        expiredEntries: 0,
        familyBreakdown: {},
        tagBreakdown: {},
      };

      (CacheService.getStats as jest.Mock).mockResolvedValue(mockStats);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);
      (CacheService.get as jest.Mock).mockResolvedValue({ test: true });
      (CacheService.delete as jest.Mock).mockResolvedValue(true);

      const health = await CacheService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Cache is operating normally');
    });

    it('should clean up test key', async () => {
      const mockStats: CacheStats = {
        totalEntries: 10,
        expiredEntries: 1,
        familyBreakdown: {},
        tagBreakdown: {},
      };

      (CacheService.getStats as jest.Mock).mockResolvedValue(mockStats);
      (CacheService.set as jest.Mock).mockResolvedValue(undefined);
      (CacheService.get as jest.Mock).mockResolvedValue({ test: true });
      (CacheService.delete as jest.Mock).mockResolvedValue(true);

      await CacheService.healthCheck();

      expect(CacheService.delete).toHaveBeenCalledWith(expect.stringMatching(/^health:/));
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty string as cache key', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await CacheService.get('');

      expect(result).toBeNull();
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(
        expect.any(Object),
        ''
      );
    });

    it('should handle very long cache keys', async () => {
      const longKey = 'a'.repeat(1000);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await CacheService.get(longKey);

      expect(result).toBeNull();
    });

    it('should handle null and undefined values', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await CacheService.set('null-key', null);
      await CacheService.set('undefined-key', undefined);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);

      // Check that both values are properly serialized
      const nullCall = mockPrisma.$executeRaw.mock.calls[0];
      const undefinedCall = mockPrisma.$executeRaw.mock.calls[1];

      expect(nullCall[3]).toContain('"value":"null"');
      expect(undefinedCall[3]).toContain('"value":null'); // undefined becomes null in JSON
    });

    it('should handle circular reference objects', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // This should throw an error due to circular reference
      await expect(CacheService.set('circular-key', circularObj)).rejects.toThrow();
    });

    it('should handle very large objects', async () => {
      const largeObj = {
        data: 'x'.repeat(100000), // 100KB string
        array: new Array(1000).fill({ nested: 'data' }),
      };

      mockPrisma.$executeRaw.mockResolvedValue(1);

      await CacheService.set('large-key', largeObj);

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should handle concurrent operations', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Simulate concurrent set operations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(CacheService.set(`concurrent-key-${i}`, { value: i }));
      }

      await Promise.all(promises);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(10);
    });

    it('should handle malformed cache data in database', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{
        token: '{"key":"test","value":"malformed-json}', // Missing closing quote
        expiresAt: new Date(),
      }]);

      const result = await CacheService.get('malformed-key');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Cache get error:', expect.any(Error));
    });
  });
});