"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_service_1 = require("../core/cache-service");
const http_server_1 = require("./http-server");
const environment_1 = require("../config/environment");
class CacheServer {
    constructor() {
        // Initialize cache with environment configuration
        this.cacheService = new cache_service_1.CacheService({
            maxSize: environment_1.config.cache.maxSize,
            defaultTTL: environment_1.config.cache.defaultTTL,
            evictionPolicy: 'lru',
            enableMetrics: environment_1.config.cache.enableMetrics,
            maxKeySize: environment_1.config.cache.maxKeySize,
            maxValueSize: environment_1.config.cache.maxValueSize
        });
        this.httpServer = new http_server_1.HTTPServer(this.cacheService, environment_1.config.server.http.port);
    }
    async start() {
        try {
            await this.httpServer.start();
            console.log('Cache Server started successfully');
            console.log(`HTTP Server: ${environment_1.config.server.http.host}:${environment_1.config.server.http.port}`);
            console.log(`Health check: http://${environment_1.config.server.http.host}:${environment_1.config.server.http.port}${environment_1.config.monitoring.healthEndpoint}`);
            console.log(`Cache stats: http://${environment_1.config.server.http.host}:${environment_1.config.server.http.port}${environment_1.config.monitoring.metricsEndpoint}`);
        }
        catch (error) {
            console.error('Failed to start cache server:', error);
            process.exit(1);
        }
    }
    async stop() {
        try {
            await this.httpServer.stop();
            this.cacheService.shutdown();
            console.log('Cache Server stopped gracefully');
        }
        catch (error) {
            console.error('Error stopping cache server:', error);
        }
    }
}
// Handle graceful shutdown
const server = new CacheServer();
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
});
// Start the server
server.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map