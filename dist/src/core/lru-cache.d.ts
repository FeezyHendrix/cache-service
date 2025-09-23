import { CacheOptions, CacheMetrics } from '../types/cache';
export declare class LRUCache<T = any> {
    private readonly maxSize;
    private readonly defaultTTL?;
    private readonly enableMetrics;
    private readonly maxKeySize;
    private readonly maxValueSize;
    private cache;
    private head;
    private tail;
    private size;
    private metrics;
    constructor(options: CacheOptions);
    get(key: string): T | null;
    set(key: string, value: T, ttl?: number): boolean;
    delete(key: string): boolean;
    clear(): void;
    has(key: string): boolean;
    getSize(): number;
    getMetrics(): CacheMetrics;
    cleanup(): number;
    private isExpired;
    private calculateExpiry;
    private moveToFront;
    private addToFront;
    private removeFromList;
    private evictLRU;
    private updateMetrics;
    private resetMetrics;
    private isValidKey;
    private isValidValue;
    private isValidTTL;
}
//# sourceMappingURL=lru-cache.d.ts.map