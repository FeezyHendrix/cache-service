export interface EnvironmentConfig {
    cache: {
        maxSize: number;
        defaultTTL?: number;
        enableMetrics: boolean;
        maxKeySize: number;
        maxValueSize: number;
        cleanupInterval: number;
    };
    server: {
        http: {
            port: number;
            host: string;
        };
        maxConnections: number;
        requestTimeout: number;
    };
    nodeEnv: string;
    logging: {
        level: string;
        format: string;
    };
    security: {
        enableCors: boolean;
        corsOrigin: string;
        apiRateLimit: number;
    };
    monitoring: {
        enableHealthCheck: boolean;
        metricsEndpoint: string;
        healthEndpoint: string;
    };
}
export declare const config: EnvironmentConfig;
//# sourceMappingURL=environment.d.ts.map