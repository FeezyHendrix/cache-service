export declare class HTTPClient {
    private host;
    private port;
    private baseUrl;
    constructor(host?: string, port?: number);
    connect(): Promise<void>;
    private makeRequest;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<boolean>;
    getStats(): Promise<any>;
    disconnect(): void;
    isConnected(): boolean;
}
//# sourceMappingURL=http-client.d.ts.map