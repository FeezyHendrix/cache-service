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
exports.TCPServer = void 0;
const net = __importStar(require("net"));
const protocol_1 = require("../utils/protocol");
class TCPServer {
    constructor(cacheService, port = 6379, host = '0.0.0.0') {
        this.cacheService = cacheService;
        this.port = port;
        this.host = host;
        this.connections = new Set();
        this.server = net.createServer();
        this.setupServer();
    }
    setupServer() {
        this.server.on('connection', (socket) => {
            if (process.env.NODE_ENV !== 'test') {
                console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
            }
            this.connections.add(socket);
            let buffer = Buffer.alloc(0);
            socket.on('data', async (data) => {
                try {
                    if (process.env.NODE_ENV !== 'test') {
                        console.log('Received data:', data.length, 'bytes');
                    }
                    buffer = Buffer.concat([buffer, data]);
                    // Process complete messages
                    while (buffer.length >= 4) {
                        try {
                            const { data: operation, bytesRead } = protocol_1.Protocol.deserialize(buffer);
                            if (process.env.NODE_ENV !== 'test') {
                                console.log('Parsed operation:', JSON.stringify(operation));
                            }
                            buffer = buffer.slice(bytesRead);
                            const response = await this.handleOperation(operation);
                            if (process.env.NODE_ENV !== 'test') {
                                console.log('Sending response:', JSON.stringify(response));
                            }
                            const responseBuffer = protocol_1.Protocol.serialize(response);
                            socket.write(responseBuffer);
                        }
                        catch (error) {
                            // Not enough data for complete message, wait for more
                            if (error instanceof Error && error.message.includes('Buffer too small')) {
                                break;
                            }
                            throw error;
                        }
                    }
                }
                catch (error) {
                    console.error('Error processing client data:', error);
                    const errorResponse = {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                    const responseBuffer = protocol_1.Protocol.serialize(errorResponse);
                    socket.write(responseBuffer);
                }
            });
            socket.on('close', () => {
                if (process.env.NODE_ENV !== 'test') {
                    console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
                }
                this.connections.delete(socket);
            });
            socket.on('error', (error) => {
                if (process.env.NODE_ENV !== 'test') {
                    console.error('Socket error:', error);
                }
                this.connections.delete(socket);
            });
        });
        this.server.on('error', (error) => {
            console.error('Server error:', error);
        });
    }
    async handleOperation(operation) {
        switch (operation.type) {
            case 'GET':
                return await this.cacheService.get(operation.key);
            case 'SET':
                return await this.cacheService.set(operation.key, operation.value, operation.ttl);
            case 'DELETE':
                return await this.cacheService.delete(operation.key);
            case 'CLEAR':
                return await this.cacheService.clear();
            case 'STATS':
                return await this.cacheService.getStats();
            default:
                return {
                    success: false,
                    error: `Unknown operation: ${operation.type}`
                };
        }
    }
    start() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, this.host, () => {
                console.log(`TCP Cache Server listening on ${this.host}:${this.port}`);
                resolve();
            });
            this.server.on('error', reject);
        });
    }
    stop() {
        return new Promise((resolve) => {
            // Close all client connections
            this.connections.forEach(socket => socket.destroy());
            this.connections.clear();
            this.server.close(() => {
                console.log('TCP Cache Server stopped');
                resolve();
            });
        });
    }
    getConnectionCount() {
        return this.connections.size;
    }
}
exports.TCPServer = TCPServer;
//# sourceMappingURL=tcp-server.js.map