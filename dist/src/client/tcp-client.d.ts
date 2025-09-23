import { CacheOperation, CacheResponse } from '../types/cache';
export declare class TCPClient {
    private socket;
    private host;
    private port;
    private connected;
    private pendingRequests;
    private requestId;
    constructor(host?: string, port?: number);
    connect(): Promise<void>;
    sendOperation(operation: CacheOperation): Promise<CacheResponse>;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<boolean>;
    getStats(): Promise<any>;
    disconnect(): void;
    isConnected(): boolean;
}
//# sourceMappingURL=tcp-client.d.ts.map