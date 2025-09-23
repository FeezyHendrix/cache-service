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
exports.HTTPClient = void 0;
const http = __importStar(require("http"));
class HTTPClient {
    constructor(host = 'localhost', port = 8080) {
        this.host = host;
        this.port = port;
        this.baseUrl = `http://${host}:${port}`;
    }
    async connect() {
        // Test connection with health check
        try {
            const response = await this.makeRequest('GET', '/health');
            if (!response.success) {
                throw new Error('Health check failed');
            }
        }
        catch (error) {
            throw new Error(`Failed to connect to cache server: ${error}`);
        }
    }
    makeRequest(method, path, data) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.host,
                port: this.port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        resolve(response);
                    }
                    catch (error) {
                        reject(new Error(`Invalid JSON response: ${body}`));
                    }
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }
    async get(key) {
        const response = await this.makeRequest('GET', `/cache/${encodeURIComponent(key)}`);
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async set(key, value, ttl) {
        const data = { value, ttl };
        const response = await this.makeRequest('POST', `/cache/${encodeURIComponent(key)}`, data);
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async delete(key) {
        const response = await this.makeRequest('DELETE', `/cache/${encodeURIComponent(key)}`);
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async clear() {
        const response = await this.makeRequest('DELETE', '/cache');
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async getStats() {
        const response = await this.makeRequest('GET', '/stats');
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.metrics || response.data;
    }
    disconnect() {
        // HTTP client doesn't need persistent connection
    }
    isConnected() {
        return true; // HTTP is stateless
    }
}
exports.HTTPClient = HTTPClient;
//# sourceMappingURL=http-client.js.map