import * as http from 'http';
import { URL } from 'url';
import { CacheService } from '../core/cache-service';
import { config } from '../config/environment';

function match(value: string, cases: Record<string, () => any>) {
  if (cases.hasOwnProperty(value)) {
    return cases[value]();
  } else if (cases.hasOwnProperty('default')) {
    return cases['default']();
  } else {
    throw new Error('No matching case found and no default case provided');
  }
}

export class HTTPServer {
  private server: http.Server;
  private cacheService: CacheService;
  private port: number;

  constructor(cacheService: CacheService, port: number = 8080) {
    this.cacheService = cacheService;
    this.port = port;
    this.server = http.createServer();
    this.setupServer();
  }

  private setupServer(): void {
    this.server.on('request', async (req, res) => {
      // Enable CORS if configured
      if (config.security.enableCors) {
        res.setHeader('Access-Control-Allow-Origin', config.security.corsOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;
        const method = req.method!;

        // Route matching using environment configuration
        const response = await match(pathname, {
          [config.monitoring.healthEndpoint]: () => ({ success: true, data: 'OK' }),
          [config.monitoring.metricsEndpoint]: () => this.cacheService.getStats(),
          '/cache': () => this.handleCacheRoot(method),
          '/cache/bulk': () => this.handleCacheBulk(method, parsedUrl, req),
          'default': () => this.handleCacheKey(pathname, method, req)
        });

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(response.success ? 200 : 400);
        res.end(JSON.stringify(response));

      } catch (error) {
        console.error('HTTP request error:', error);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(500);
        res.end(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error'
        }));
      }
    });
  }

  private getRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  private async handleCacheRoot(method: string) {
    if (method === 'DELETE') {
      return await this.cacheService.clear();
    }
    return { success: false, error: 'Method not allowed' };
  }

  private async handleCacheBulk(method: string, parsedUrl: URL, req: http.IncomingMessage) {
    if (method === 'GET') {
      const keys = parsedUrl.searchParams.get('keys');
      if (keys) {
        const keyArray = keys.split(',');
        return await this.cacheService.mget(keyArray);
      } else {
        return { success: false, error: 'Missing keys parameter' };
      }
    } else if (method === 'POST') {
      const body = await this.getRequestBody(req);
      const entries = JSON.parse(body);
      return await this.cacheService.mset(entries);
    }
    return { success: false, error: 'Method not allowed' };
  }

  private async handleCacheKey(pathname: string, method: string, req: http.IncomingMessage) {
    if (pathname.startsWith('/cache/')) {
      const key = pathname.split('/cache/')[1];
      
      if (method === 'GET') {
        return await this.cacheService.get(key);
      } else if (method === 'DELETE') {
        return await this.cacheService.delete(key);
      } else if (method === 'POST' || method === 'PUT') {
        const body = await this.getRequestBody(req);
        const data = JSON.parse(body);
        return await this.cacheService.set(key, data.value, data.ttl);
      } else {
        return { success: false, error: 'Method not allowed' };
      }
    }
    return { success: false, error: 'Not found' };
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        console.log(`HTTP Cache Server listening on port ${this.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('HTTP Cache Server stopped');
        resolve();
      });
    });
  }
}