import { CacheService } from '../core/cache-service';
export declare class TCPServer {
    private server;
    private cacheService;
    private port;
    private host;
    private connections;
    constructor(cacheService: CacheService, port?: number, host?: string);
    private setupServer;
    private handleOperation;
    start(): Promise<void>;
    stop(): Promise<void>;
    getConnectionCount(): number;
}
//# sourceMappingURL=tcp-server.d.ts.map