import { CacheService } from '../core/cache-service';
export declare class HTTPServer {
    private server;
    private cacheService;
    private port;
    constructor(cacheService: CacheService, port?: number);
    private setupServer;
    private getRequestBody;
    private handleCacheRoot;
    private handleCacheBulk;
    private handleCacheKey;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=http-server.d.ts.map