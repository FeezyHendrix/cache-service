import { LRUCache } from './lru-cache';
import { CacheOptions, CacheResponse, CacheMetrics } from '../types/cache';

export class CacheService {
  private cache: LRUCache;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(options: CacheOptions) {
    this.cache = new LRUCache(options);
    this.cleanupInterval = null;
    
    // Start cleanup process for expired entries
    this.startCleanupProcess();
  }

  async get(key: string): Promise<CacheResponse> {
    try {
      const value = this.cache.get(key);
      return {
        success: true,
        data: value
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<CacheResponse> {
    try {
      const success = this.cache.set(key, value, ttl);
      return {
        success,
        data: success
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async delete(key: string): Promise<CacheResponse> {
    try {
      const success = this.cache.delete(key);
      return {
        success: true,
        data: success
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async clear(): Promise<CacheResponse> {
    try {
      this.cache.clear();
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async has(key: string): Promise<CacheResponse> {
    try {
      const exists = this.cache.has(key);
      return {
        success: true,
        data: exists
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getStats(): Promise<CacheResponse> {
    try {
      const metrics = this.cache.getMetrics();
      return {
        success: true,
        data: metrics,
        metrics
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSize(): Promise<CacheResponse> {
    try {
      const size = this.cache.getSize();
      return {
        success: true,
        data: size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Bulk operations for better performance
  async mget(keys: string[]): Promise<CacheResponse> {
    try {
      const results: Record<string, any> = {};
      for (const key of keys) {
        results[key] = this.cache.get(key);
      }
      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<CacheResponse> {
    try {
      const results: Record<string, boolean> = {};
      for (const entry of entries) {
        results[entry.key] = this.cache.set(entry.key, entry.value, entry.ttl);
      }
      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private startCleanupProcess(): void {
    // Clean up expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cache.cleanup();
    }, 30000);
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}