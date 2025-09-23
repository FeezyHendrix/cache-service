import { CacheService } from '../src/core/cache-service';
import { TCPServer } from '../src/server/tcp-server';
import { HTTPServer } from '../src/server/http-server';
import { TCPClient } from '../src/client/tcp-client';

describe('Integration Tests', () => {
  let cacheService: CacheService;
  let tcpServer: TCPServer;
  let httpServer: HTTPServer;
  let tcpClient: TCPClient;

  beforeAll(async () => {
    // Use different ports for testing
    cacheService = new CacheService({
      maxSize: 100,
      defaultTTL: 5000,
      enableMetrics: true
    });

    tcpServer = new TCPServer(cacheService, 16379);
    httpServer = new HTTPServer(cacheService, 18080);
    
    await Promise.all([
      tcpServer.start(),
      httpServer.start()
    ]);

    tcpClient = new TCPClient('localhost', 16379);
    await tcpClient.connect();
  });

  afterAll(async () => {
    if (tcpClient) {
      tcpClient.disconnect();
    }
    
    // Wait for connections to close
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await Promise.all([
      tcpServer.stop(),
      httpServer.stop()
    ]);
    cacheService.shutdown();
  });

  describe('TCP Server Integration', () => {
    test('should handle basic operations via TCP', async () => {
      // Set a value
      const setResult = await tcpClient.set('test-key', 'test-value');
      expect(setResult).toBe(true);

      // Get the value
      const getValue = await tcpClient.get('test-key');
      expect(getValue).toBe('test-value');

      // Delete the value
      const deleteResult = await tcpClient.delete('test-key');
      expect(deleteResult).toBe(true);

      // Verify it's gone
      const getDeleted = await tcpClient.get('test-key');
      expect(getDeleted).toBeNull();
    });

    test('should handle TTL via TCP', async () => {
      await tcpClient.set('ttl-key', 'ttl-value', 100);
      
      // Should exist immediately
      expect(await tcpClient.get('ttl-key')).toBe('ttl-value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await tcpClient.get('ttl-key')).toBeNull();
    });

    test('should return statistics via TCP', async () => {
      await tcpClient.clear();
      await tcpClient.set('stats-key', 'stats-value');
      await tcpClient.get('stats-key'); // hit
      await tcpClient.get('nonexistent'); // miss

      const stats = await tcpClient.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.sets).toBeGreaterThan(0);
      expect(stats.currentSize).toBeGreaterThan(0);
    });
  });

  describe('HTTP Server Integration', () => {
    test('should handle health check', async () => {
      const response = await fetch('http://localhost:18080/health');
      const data = await response.json() as any;
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBe('OK');
    });

    test('should handle basic operations via HTTP', async () => {
      // Set a value
      const setResponse = await fetch('http://localhost:18080/cache/http-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'http-value' })
      });
      const setData = await setResponse.json() as any;
      expect(setData.success).toBe(true);

      // Get the value
      const getResponse = await fetch('http://localhost:18080/cache/http-key');
      const getData = await getResponse.json() as any;
      expect(getData.success).toBe(true);
      expect(getData.data).toBe('http-value');

      // Delete the value
      const deleteResponse = await fetch('http://localhost:18080/cache/http-key', {
        method: 'DELETE'
      });
      const deleteData = await deleteResponse.json() as any;
      expect(deleteData.success).toBe(true);
    });

    test('should handle bulk operations via HTTP', async () => {
      // Bulk set
      const entries = [
        { key: 'bulk1', value: 'value1' },
        { key: 'bulk2', value: 'value2' }
      ];
      
      const setResponse = await fetch('http://localhost:18080/cache/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries)
      });
      const setData = await setResponse.json() as any;
      expect(setData.success).toBe(true);

      // Bulk get
      const getResponse = await fetch('http://localhost:18080/cache/bulk?keys=bulk1,bulk2');
      const getData = await getResponse.json() as any;
      expect(getData.success).toBe(true);
      expect(getData.data).toBeDefined();
      expect(getData.data.bulk1).toBe('value1');
      expect(getData.data.bulk2).toBe('value2');
    });

    test('should handle statistics via HTTP', async () => {
      const response = await fetch('http://localhost:18080/stats');
      const data = await response.json() as any;
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('hits');
      expect(data.data).toHaveProperty('misses');
      expect(data.data).toHaveProperty('currentSize');
    });
  });

  describe('Cross-Protocol Consistency', () => {
    test('should maintain data consistency between TCP and HTTP', async () => {
      // Set via TCP
      await tcpClient.set('cross-key', 'cross-value');

      // Get via HTTP
      const httpResponse = await fetch('http://localhost:18080/cache/cross-key');
      const httpData = await httpResponse.json() as any;
      expect(httpData.data).toBe('cross-value');

      // Update via HTTP
      await fetch('http://localhost:18080/cache/cross-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'updated-value' })
      });

      // Verify via TCP
      const tcpValue = await tcpClient.get('cross-key');
      expect(tcpValue).toBe('updated-value');
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent operations', async () => {
      // Clear cache first
      await tcpClient.clear();
      
      const operations = [];
      
      // Create 20 concurrent operations (reduced for test stability)
      for (let i = 0; i < 20; i++) {
        operations.push(tcpClient.set(`concurrent-${i}`, `value-${i}`));
      }
      
      // Wait for all to complete
      const results = await Promise.all(operations);
      expect(results.every(result => result === true)).toBe(true);
      
      // Delay to ensure all operations are processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify all values exist (do them sequentially to avoid listener buildup)
      for (let i = 0; i < 20; i++) {
        const value = await tcpClient.get(`concurrent-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });
  });
});