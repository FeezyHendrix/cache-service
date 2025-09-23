#!/usr/bin/env node
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
const readline = __importStar(require("readline"));
const http_client_1 = require("./http-client");
const protocol_1 = require("../utils/protocol");
class CacheCLI {
    constructor() {
        this.client = new http_client_1.HTTPClient();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'cache> '
        });
    }
    async start() {
        console.log('Zencastr Cache CLI');
        console.log('Connecting to cache server...');
        try {
            await this.client.connect();
            console.log('Connected! Type "help" for available commands.');
            this.rl.prompt();
            this.rl.on('line', async (input) => {
                await this.handleCommand(input.trim());
                this.rl.prompt();
            });
            this.rl.on('close', () => {
                console.log('\nGoodbye!');
                this.client.disconnect();
                process.exit(0);
            });
        }
        catch (error) {
            console.error('Failed to connect to cache server:', error);
            process.exit(1);
        }
    }
    async handleCommand(input) {
        if (!input)
            return;
        try {
            if (input.toLowerCase() === 'help') {
                this.showHelp();
                return;
            }
            if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
                this.rl.close();
                return;
            }
            const operation = protocol_1.Protocol.parseCommand(input);
            let result;
            switch (operation.type) {
                case 'GET':
                    result = await this.client.get(operation.key);
                    break;
                case 'SET':
                    result = await this.client.set(operation.key, operation.value, operation.ttl);
                    break;
                case 'DELETE':
                    result = await this.client.delete(operation.key);
                    break;
                case 'CLEAR':
                    result = await this.client.clear();
                    break;
                case 'STATS':
                    result = await this.client.getStats();
                    break;
                default:
                    throw new Error(`Unknown operation: ${operation.type}`);
            }
            const response = { success: true, data: result };
            const formatted = protocol_1.Protocol.formatResponse(response);
            console.log(formatted);
        }
        catch (error) {
            console.error('Error:', error instanceof Error ? error.message : error);
        }
    }
    showHelp() {
        console.log(`
Available commands:
  GET <key>              - Get value for key
  SET <key> <value>      - Set key to value
  SET <key> <value> <ttl> - Set key to value with TTL (milliseconds)
  DELETE <key>           - Delete key
  DEL <key>              - Alias for DELETE
  CLEAR                  - Clear all keys
  STATS                  - Show cache statistics
  help                   - Show this help message
  exit, quit             - Exit the CLI

Examples:
  SET mykey "hello world"
  GET mykey
  SET temp_key value 5000
  DELETE mykey
  STATS
    `);
    }
}
// Performance test function
async function performanceTest() {
    const client = new http_client_1.HTTPClient();
    try {
        await client.connect();
        console.log('Running performance test...');
        const iterations = 1000; // Reduced for HTTP to avoid overwhelming
        const start = Date.now();
        // Set operations
        for (let i = 0; i < iterations; i++) {
            await client.set(`key${i}`, `value${i}`);
        }
        const setTime = Date.now() - start;
        console.log(`SET: ${iterations} operations in ${setTime}ms (${(iterations / setTime * 1000).toFixed(2)} ops/sec)`);
        // Get operations
        const getStart = Date.now();
        for (let i = 0; i < iterations; i++) {
            await client.get(`key${i}`);
        }
        const getTime = Date.now() - getStart;
        console.log(`GET: ${iterations} operations in ${getTime}ms (${(iterations / getTime * 1000).toFixed(2)} ops/sec)`);
        // Statistics
        const stats = await client.getStats();
        console.log('\nFinal Statistics:');
        console.log(JSON.stringify(stats, null, 2));
        client.disconnect();
    }
    catch (error) {
        console.error('Performance test failed:', error);
        process.exit(1);
    }
}
// Main execution
if (process.argv.includes('--perf')) {
    performanceTest();
}
else {
    const cli = new CacheCLI();
    cli.start();
}
//# sourceMappingURL=cli.js.map