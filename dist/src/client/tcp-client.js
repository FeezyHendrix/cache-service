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
exports.TCPClient = void 0;
const net = __importStar(require("net"));
const protocol_1 = require("../utils/protocol");
class TCPClient {
    constructor(host = 'localhost', port = 6379) {
        this.socket = null;
        this.host = host;
        this.port = port;
        this.connected = false;
        this.pendingRequests = new Map();
        this.requestId = 0;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            this.socket.setMaxListeners(20); // Increase max listeners
            this.socket.connect(this.port, this.host, () => {
                this.connected = true;
                if (process.env.NODE_ENV !== 'test') {
                    console.log(`Connected to cache server at ${this.host}:${this.port}`);
                }
                resolve();
            });
            this.socket.on('error', (error) => {
                this.connected = false;
                reject(error);
            });
            this.socket.on('close', () => {
                this.connected = false;
                if (process.env.NODE_ENV !== 'test') {
                    console.log('Disconnected from cache server');
                }
            });
        });
    }
    async sendOperation(operation) {
        if (!this.connected || !this.socket) {
            throw new Error('Not connected to server');
        }
        return new Promise((resolve, reject) => {
            const requestBuffer = protocol_1.Protocol.serialize(operation);
            let responseBuffer = Buffer.alloc(0);
            const onData = (data) => {
                try {
                    responseBuffer = Buffer.concat([responseBuffer, data]);
                    if (responseBuffer.length >= 4) {
                        const { data: response } = protocol_1.Protocol.deserialize(responseBuffer);
                        this.socket.removeListener('data', onData);
                        resolve(response);
                    }
                }
                catch (error) {
                    this.socket.removeListener('data', onData);
                    reject(error);
                }
            };
            this.socket.on('data', onData);
            this.socket.write(requestBuffer);
            // Timeout after 10 seconds
            setTimeout(() => {
                this.socket.removeListener('data', onData);
                reject(new Error('Request timeout'));
            }, 10000);
        });
    }
    async get(key) {
        const response = await this.sendOperation({ type: 'GET', key });
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async set(key, value, ttl) {
        const response = await this.sendOperation({ type: 'SET', key, value, ttl });
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async delete(key) {
        const response = await this.sendOperation({ type: 'DELETE', key });
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async clear() {
        const response = await this.sendOperation({ type: 'CLEAR' });
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    async getStats() {
        const response = await this.sendOperation({ type: 'STATS' });
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
            this.connected = false;
        }
    }
    isConnected() {
        return this.connected;
    }
}
exports.TCPClient = TCPClient;
//# sourceMappingURL=tcp-client.js.map