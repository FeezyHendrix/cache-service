#!/usr/bin/env node

import * as readline from 'readline';
import { TCPClient } from './tcp-client';
import { Protocol } from '../utils/protocol';

class CacheCLI {
  private client: TCPClient;
  private rl: readline.Interface;

  constructor() {
    this.client = new TCPClient();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'cache> '
    });
  }

  async start(): Promise<void> {
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

    } catch (error) {
      console.error('Failed to connect to cache server:', error);
      process.exit(1);
    }
  }

  private async handleCommand(input: string): Promise<void> {
    if (!input) return;

    try {
      if (input.toLowerCase() === 'help') {
        this.showHelp();
        return;
      }

      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        this.rl.close();
        return;
      }

      const operation = Protocol.parseCommand(input);
      const response = await this.client.sendOperation(operation);
      const formatted = Protocol.formatResponse(response);
      console.log(formatted);

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
    }
  }

  private showHelp(): void {
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
async function performanceTest(): Promise<void> {
  const client = new TCPClient();
  
  try {
    await client.connect();
    console.log('Running performance test...');
    
    const iterations = 10000;
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
    
  } catch (error) {
    console.error('Performance test failed:', error);
    process.exit(1);
  }
}

// Main execution
if (process.argv.includes('--perf')) {
  performanceTest();
} else {
  const cli = new CacheCLI();
  cli.start();
}