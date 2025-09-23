import { CacheService } from '../core/cache-service';
import { HTTPServer } from './http-server';
import { config } from '../config/environment';

class CacheServer {
  private cacheService: CacheService;
  private httpServer: HTTPServer;

  constructor() {
    // Initialize cache with environment configuration
    this.cacheService = new CacheService({
      maxSize: config.cache.maxSize,
      defaultTTL: config.cache.defaultTTL,
      evictionPolicy: 'lru',
      enableMetrics: config.cache.enableMetrics,
      maxKeySize: config.cache.maxKeySize,
      maxValueSize: config.cache.maxValueSize
    });

    this.httpServer = new HTTPServer(this.cacheService, config.server.http.port);
  }

  async start(): Promise<void> {
    try {
      await this.httpServer.start();

      console.log('Cache Server started successfully');
      console.log(`HTTP Server: ${config.server.http.host}:${config.server.http.port}`);
      console.log(`Health check: http://${config.server.http.host}:${config.server.http.port}${config.monitoring.healthEndpoint}`);
      console.log(`Cache stats: http://${config.server.http.host}:${config.server.http.port}${config.monitoring.metricsEndpoint}`);
    } catch (error) {
      console.error('Failed to start cache server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.httpServer.stop();
      
      this.cacheService.shutdown();
      console.log('Cache Server stopped gracefully');
    } catch (error) {
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