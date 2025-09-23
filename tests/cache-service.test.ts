import { CacheService } from '../src/core/cache-service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService({
      maxSize: 5,
      defaultTTL: 1000,
      enableMetrics: true
    });
  });

  afterEach(() => {
    cacheService.shutdown();
  });

  describe('Basic Operations', () => {
    test('should set and get values', async () => {
      const setResponse = await cacheService.set('key1', 'value1');
      expect(setResponse.success).toBe(true);
      
      const getResponse = await cacheService.get('key1');
      expect(getResponse.success).toBe(true);
      expect(getResponse.data).toBe('value1');
    });

    test('should return null for non-existent keys', async () => {
      const response = await cacheService.get('nonexistent');
      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });

    test('should delete values', async () => {
      await cacheService.set('key1', 'value1');
      const deleteResponse = await cacheService.delete('key1');
      expect(deleteResponse.success).toBe(true);
      expect(deleteResponse.data).toBe(true);
      
      const getResponse = await cacheService.get('key1');
      expect(getResponse.data).toBeNull();
    });

    test('should check if key exists', async () => {
      await cacheService.set('key1', 'value1');
      
      const existsResponse = await cacheService.has('key1');
      expect(existsResponse.success).toBe(true);
      expect(existsResponse.data).toBe(true);
      
      const notExistsResponse = await cacheService.has('nonexistent');
      expect(notExistsResponse.success).toBe(true);
      expect(notExistsResponse.data).toBe(false);
    });

    test('should clear all values', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      const clearResponse = await cacheService.clear();
      expect(clearResponse.success).toBe(true);
      
      const sizeResponse = await cacheService.getSize();
      expect(sizeResponse.data).toBe(0);
    });
  });

  describe('Bulk Operations', () => {
    test('should get multiple values', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');
      
      const response = await cacheService.mget(['key1', 'key2', 'nonexistent']);
      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        key1: 'value1',
        key2: 'value2',
        nonexistent: null
      });
    });

    test('should set multiple values', async () => {
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2', ttl: 500 },
        { key: 'key3', value: 'value3' }
      ];
      
      const response = await cacheService.mset(entries);
      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        key1: true,
        key2: true,
        key3: true
      });
      
      // Verify values were set
      const getValue1 = await cacheService.get('key1');
      const getValue2 = await cacheService.get('key2');
      expect(getValue1.data).toBe('value1');
      expect(getValue2.data).toBe('value2');
    });
  });

  describe('TTL Support', () => {
    test('should set values with custom TTL', async () => {
      const response = await cacheService.set('key1', 'value1', 100);
      expect(response.success).toBe(true);
      
      const getResponse = await cacheService.get('key1');
      expect(getResponse.data).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      const expiredResponse = await cacheService.get('key1');
      expect(expiredResponse.data).toBeNull();
    });
  });

  describe('Metrics', () => {
    test('should return cache statistics', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.get('key1'); // hit
      await cacheService.get('nonexistent'); // miss
      
      const statsResponse = await cacheService.getStats();
      expect(statsResponse.success).toBe(true);
      expect(statsResponse.data.hits).toBe(1);
      expect(statsResponse.data.misses).toBe(1);
      expect(statsResponse.data.sets).toBe(1);
      expect(statsResponse.data.currentSize).toBe(1);
    });
  });

  describe('Size Management', () => {
    test('should return current cache size', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      const sizeResponse = await cacheService.getSize();
      expect(sizeResponse.success).toBe(true);
      expect(sizeResponse.data).toBe(2);
    });
  });

  describe('Complex Data Types', () => {
    test('should handle objects', async () => {
      const obj = { name: 'test', value: 123, nested: { data: true } };
      await cacheService.set('object', obj);
      
      const response = await cacheService.get('object');
      expect(response.data).toEqual(obj);
    });

    test('should handle arrays', async () => {
      const arr = [1, 'two', { three: 3 }, null, undefined];
      await cacheService.set('array', arr);
      
      const response = await cacheService.get('array');
      expect(response.data).toEqual(arr);
    });

    test('should handle primitive types', async () => {
      await cacheService.set('string', 'hello');
      await cacheService.set('number', 42);
      await cacheService.set('boolean', true);
      await cacheService.set('null', null);
      
      expect((await cacheService.get('string')).data).toBe('hello');
      expect((await cacheService.get('number')).data).toBe(42);
      expect((await cacheService.get('boolean')).data).toBe(true);
      expect((await cacheService.get('null')).data).toBeNull();
    });
  });
});