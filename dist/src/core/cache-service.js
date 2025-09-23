"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const lru_cache_1 = require("./lru-cache");
class CacheService {
    constructor(options) {
        this.cache = new lru_cache_1.LRUCache(options);
        this.cleanupInterval = null;
        // Start cleanup process for expired entries
        this.startCleanupProcess();
    }
    async get(key) {
        try {
            const value = this.cache.get(key);
            return {
                success: true,
                data: value
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async set(key, value, ttl) {
        try {
            const success = this.cache.set(key, value, ttl);
            return {
                success,
                data: success
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async delete(key) {
        try {
            const success = this.cache.delete(key);
            return {
                success: true,
                data: success
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async clear() {
        try {
            this.cache.clear();
            return {
                success: true,
                data: true
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async has(key) {
        try {
            const exists = this.cache.has(key);
            return {
                success: true,
                data: exists
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getStats() {
        try {
            const metrics = this.cache.getMetrics();
            return {
                success: true,
                data: metrics,
                metrics
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getSize() {
        try {
            const size = this.cache.getSize();
            return {
                success: true,
                data: size
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    // Bulk operations for better performance
    async mget(keys) {
        try {
            const results = {};
            for (const key of keys) {
                results[key] = this.cache.get(key);
            }
            return {
                success: true,
                data: results
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async mset(entries) {
        try {
            const results = {};
            for (const entry of entries) {
                results[entry.key] = this.cache.set(entry.key, entry.value, entry.ttl);
            }
            return {
                success: true,
                data: results
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    startCleanupProcess() {
        // Clean up expired entries every 30 seconds
        this.cleanupInterval = setInterval(() => {
            this.cache.cleanup();
        }, 30000);
    }
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cache-service.js.map