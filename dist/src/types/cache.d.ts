export interface CacheNode<T = any> {
    key: string;
    value: T;
    prev: CacheNode<T> | null;
    next: CacheNode<T> | null;
    expiresAt?: number;
    createdAt: number;
    accessCount: number;
}
export interface CacheOptions {
    maxSize: number;
    defaultTTL?: number;
    evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'ttl';
    enableMetrics?: boolean;
    maxKeySize?: number;
    maxValueSize?: number;
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    currentSize: number;
    hitRate: number;
}
export interface CacheOperation {
    type: 'GET' | 'SET' | 'DELETE' | 'CLEAR' | 'STATS';
    key?: string;
    value?: any;
    ttl?: number;
}
export interface CacheResponse {
    success: boolean;
    data?: any;
    error?: string;
    metrics?: CacheMetrics;
}
//# sourceMappingURL=cache.d.ts.map