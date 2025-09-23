import { LRUCache } from '../src/core/lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({
      maxSize: 3,
      enableMetrics: true
    });
  });

  describe('Basic Operations', () => {
    test('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    test('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    test('should return false when deleting non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    test('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    test('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.getSize()).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used item when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    test('should update LRU order on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    test('should update existing keys without eviction', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key1', 'updated_value1'); // Update existing key

      expect(cache.getSize()).toBe(3);
      expect(cache.get('key1')).toBe('updated_value1');
    });
  });

  describe('TTL Support', () => {
    test('should expire values after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    test('should not return expired values', async () => {
      cache.set('key1', 'value1', 50);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.has('key1')).toBe(false);
    });

    test('should clean up expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 50);
      cache.set('key3', 'value3'); // No TTL
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const removed = cache.cleanup();
      
      expect(removed).toBe(2);
      expect(cache.getSize()).toBe(1);
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('Metrics', () => {
    test('should track hits and misses', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss
      
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.sets).toBe(1);
    });

    test('should track evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should trigger eviction
      
      const metrics = cache.getMetrics();
      expect(metrics.evictions).toBe(1);
    });

    test('should calculate hit rate', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss
      
      const metrics = cache.getMetrics();
      expect(metrics.hitRate).toBe(2/3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero capacity', () => {
      const zeroCache = new LRUCache({ maxSize: 0 });
      expect(zeroCache.set('key1', 'value1')).toBe(true);
      expect(zeroCache.get('key1')).toBeNull();
    });

    test('should handle single capacity', () => {
      const singleCache = new LRUCache({ maxSize: 1 });
      singleCache.set('key1', 'value1');
      singleCache.set('key2', 'value2');
      
      expect(singleCache.get('key1')).toBeNull();
      expect(singleCache.get('key2')).toBe('value2');
    });

    test('should handle undefined and null values', () => {
      cache.set('undefined', undefined as any);
      cache.set('null', null as any);
      
      expect(cache.get('undefined')).toBeUndefined();
      expect(cache.get('null')).toBeNull();
      expect(cache.has('undefined')).toBe(true);
      expect(cache.has('null')).toBe(true);
    });
  });

  describe('Input Sanitization - Key Validation', () => {
    test('should reject non-string keys', () => {
      expect(cache.set(123 as any, 'value')).toBe(false);
      expect(cache.set(null as any, 'value')).toBe(false);
      expect(cache.set(undefined as any, 'value')).toBe(false);
      expect(cache.set({} as any, 'value')).toBe(false);
      expect(cache.set([] as any, 'value')).toBe(false);
    });

    test('should reject empty keys', () => {
      expect(cache.set('', 'value')).toBe(false);
      expect(cache.get('')).toBeNull();
      expect(cache.has('')).toBe(false);
      expect(cache.delete('')).toBe(false);
    });

    test('should reject keys exceeding maximum size', () => {
      const longKey = 'a'.repeat(300); // Exceeds default 256 byte limit
      expect(cache.set(longKey, 'value')).toBe(false);
      expect(cache.get(longKey)).toBeNull();
    });

    test('should reject dangerous prototype pollution keys', () => {
      expect(cache.set('__proto__', 'malicious')).toBe(false);
      expect(cache.set('constructor', 'malicious')).toBe(false);
      expect(cache.set('prototype', 'malicious')).toBe(false);
    });

    test('should reject keys with control characters', () => {
      expect(cache.set('key\x00null', 'value')).toBe(false);
      expect(cache.set('key\x01control', 'value')).toBe(false);
      expect(cache.set('key\x1Fcontrol', 'value')).toBe(false);
      expect(cache.set('key\x7Fdel', 'value')).toBe(false);
    });

    test('should accept valid keys', () => {
      expect(cache.set('validKey123', 'value')).toBe(true);
      expect(cache.set('key-with-dashes', 'value')).toBe(true);
      expect(cache.set('key_with_underscores', 'value')).toBe(true);
      expect(cache.set('key.with.dots', 'value')).toBe(true);
      expect(cache.set('key with spaces', 'value')).toBe(true);
    });

    test('should respect custom maxKeySize', () => {
      const customCache = new LRUCache({ maxSize: 3, maxKeySize: 5 });
      expect(customCache.set('short', 'value')).toBe(true);
      expect(customCache.set('toolong', 'value')).toBe(false);
    });
  });

  describe('Input Sanitization - Value Validation', () => {
    test('should accept legitimate objects', () => {
      const obj = { name: 'test', value: 123, nested: { data: true } };
      expect(cache.set('object', obj as any)).toBe(true);
      expect(cache.get('object')).toEqual(obj);
    });

    test('should accept arrays', () => {
      const arr = [1, 'two', { three: 3 }, null, undefined];
      expect(cache.set('array', arr as any)).toBe(true);
      expect(cache.get('array')).toEqual(arr);
    });

    test('should reject values exceeding maximum size', () => {
      const smallCache = new LRUCache({ maxSize: 3, maxValueSize: 50 });
      const largeValue = 'x'.repeat(100);
      expect(smallCache.set('large', largeValue as any)).toBe(false);
    });


    test('should reject prototype pollution attempts via prototype', () => {
      const maliciousObj = { prototype: { polluted: true } };
      expect(cache.set('malicious2', maliciousObj as any)).toBe(false);
    });

    test('should reject dangerous constructor assignments', () => {
      const maliciousObj = { constructor: String };
      expect(cache.set('malicious3', maliciousObj as any)).toBe(false);
    });

    test('should allow objects with normal constructor', () => {
      const normalObj = { data: 'test' };
      expect(cache.set('normal', normalObj as any)).toBe(true);
    });

    test('should allow arrays with normal constructor', () => {
      const normalArray = [1, 2, 3];
      expect(cache.set('normalArray', normalArray as any)).toBe(true);
    });

    test('should handle JSON serialization failures gracefully', () => {
      const circularObj = {} as any;
      circularObj.self = circularObj;
      // Should still validate basic constraints even if JSON.stringify fails
      expect(cache.set('circular', circularObj)).toBe(true);
    });
  });

  describe('Input Sanitization - TTL Validation', () => {
    test('should reject non-numeric TTL values', () => {
      expect(cache.set('key1', 'value', 'invalid' as any)).toBe(false);
      expect(cache.set('key2', 'value', {} as any)).toBe(false);
      expect(cache.set('key3', 'value', [] as any)).toBe(false);
    });

    test('should reject NaN TTL values', () => {
      expect(cache.set('key1', 'value', NaN)).toBe(false);
    });

    test('should reject infinite TTL values', () => {
      expect(cache.set('key1', 'value', Infinity)).toBe(false);
      expect(cache.set('key2', 'value', -Infinity)).toBe(false);
    });

    test('should reject negative TTL values', () => {
      expect(cache.set('key1', 'value', -1)).toBe(false);
      expect(cache.set('key2', 'value', -100)).toBe(false);
    });

    test('should reject extremely large TTL values', () => {
      expect(cache.set('key1', 'value', Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    });

    test('should accept valid TTL values', () => {
      expect(cache.set('key1', 'value', 1000)).toBe(true);
      expect(cache.set('key2', 'value', 0)).toBe(true);
      expect(cache.set('key3', 'value', Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    test('should accept undefined TTL', () => {
      expect(cache.set('key1', 'value', undefined)).toBe(true);
      expect(cache.set('key2', 'value')).toBe(true);
    });
  });

  describe('Input Sanitization - Size Limits', () => {
    test('should enforce custom size limits', () => {
      const limitedCache = new LRUCache({
        maxSize: 3,
        maxKeySize: 10,
        maxValueSize: 20
      });

      // Test key size limit
      expect(limitedCache.set('shortkey', 'value' as any)).toBe(true);
      expect(limitedCache.set('verylongkeythatexceedslimit', 'value' as any)).toBe(false);

      // Test value size limit
      expect(limitedCache.set('key1', 'short' as any)).toBe(true);
      expect(limitedCache.set('key2', 'very long value that exceeds the limit' as any)).toBe(false);
    });

    test('should use default size limits when not specified', () => {
      const defaultCache = new LRUCache({ maxSize: 3 });
      
      // Should accept reasonable sizes
      expect(defaultCache.set('reasonableKey', 'reasonable value' as any)).toBe(true);
      
      // Should reject extremely large keys (exceeds default 256)
      const hugeKey = 'k'.repeat(500);
      expect(defaultCache.set(hugeKey, 'value' as any)).toBe(false);
    });
  });
});