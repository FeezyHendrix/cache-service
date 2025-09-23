"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPServer = void 0;
const http = __importStar(require("http"));
const url_1 = require("url");
const environment_1 = require("../config/environment");
function match(value, cases) {
    if (cases.hasOwnProperty(value)) {
        return cases[value]();
    }
    else if (cases.hasOwnProperty('default')) {
        return cases['default']();
    }
    else {
        throw new Error('No matching case found and no default case provided');
    }
}
class HTTPServer {
    constructor(cacheService, port = 8080) {
        this.cacheService = cacheService;
        this.port = port;
        this.server = http.createServer();
        this.setupServer();
    }
    setupServer() {
        this.server.on('request', async (req, res) => {
            // Enable CORS if configured
            if (environment_1.config.security.enableCors) {
                res.setHeader('Access-Control-Allow-Origin', environment_1.config.security.corsOrigin);
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            }
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            try {
                const parsedUrl = new url_1.URL(req.url, `http://${req.headers.host}`);
                const pathname = parsedUrl.pathname;
                const method = req.method;
                // Route matching using environment configuration
                const response = await match(pathname, {
                    [environment_1.config.monitoring.healthEndpoint]: () => ({ success: true, data: 'OK' }),
                    [environment_1.config.monitoring.metricsEndpoint]: () => this.cacheService.getStats(),
                    '/cache': () => this.handleCacheRoot(method),
                    '/cache/bulk': () => this.handleCacheBulk(method, parsedUrl, req),
                    'default': () => this.handleCacheKey(pathname, method, req)
                });
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(response.success ? 200 : 400);
                res.end(JSON.stringify(response));
            }
            catch (error) {
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
    getRequestBody(req) {
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
    async handleCacheRoot(method) {
        if (method === 'DELETE') {
            return await this.cacheService.clear();
        }
        return { success: false, error: 'Method not allowed' };
    }
    async handleCacheBulk(method, parsedUrl, req) {
        if (method === 'GET') {
            const keys = parsedUrl.searchParams.get('keys');
            if (keys) {
                const keyArray = keys.split(',');
                return await this.cacheService.mget(keyArray);
            }
            else {
                return { success: false, error: 'Missing keys parameter' };
            }
        }
        else if (method === 'POST') {
            const body = await this.getRequestBody(req);
            const entries = JSON.parse(body);
            return await this.cacheService.mset(entries);
        }
        return { success: false, error: 'Method not allowed' };
    }
    async handleCacheKey(pathname, method, req) {
        if (pathname.startsWith('/cache/')) {
            const key = pathname.split('/cache/')[1];
            if (method === 'GET') {
                return await this.cacheService.get(key);
            }
            else if (method === 'DELETE') {
                return await this.cacheService.delete(key);
            }
            else if (method === 'POST' || method === 'PUT') {
                const body = await this.getRequestBody(req);
                const data = JSON.parse(body);
                return await this.cacheService.set(key, data.value, data.ttl);
            }
            else {
                return { success: false, error: 'Method not allowed' };
            }
        }
        return { success: false, error: 'Not found' };
    }
    start() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                console.log(`HTTP Cache Server listening on port ${this.port}`);
                resolve();
            });
            this.server.on('error', reject);
        });
    }
    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                console.log('HTTP Cache Server stopped');
                resolve();
            });
        });
    }
}
exports.HTTPServer = HTTPServer;
//# sourceMappingURL=http-server.js.map