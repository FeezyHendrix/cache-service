import { CacheOptions, CacheResponse } from '../types/cache';
export declare class CacheService {
    private cache;
    private cleanupInterval;
    constructor(options: CacheOptions);
    get(key: string): Promise<CacheResponse>;
    set(key: string, value: any, ttl?: number): Promise<CacheResponse>;
    delete(key: string): Promise<CacheResponse>;
    clear(): Promise<CacheResponse>;
    has(key: string): Promise<CacheResponse>;
    getStats(): Promise<CacheResponse>;
    getSize(): Promise<CacheResponse>;
    mget(keys: string[]): Promise<CacheResponse>;
    mset(entries: Array<{
        key: string;
        value: any;
        ttl?: number;
    }>): Promise<CacheResponse>;
    private startCleanupProcess;
    shutdown(): void;
}
//# sourceMappingURL=cache-service.d.ts.map