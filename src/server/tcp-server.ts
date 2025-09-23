import * as net from 'net';
import { CacheService } from '../core/cache-service';
import { Protocol } from '../utils/protocol';
import { CacheOperation } from '../types/cache';

export class TCPServer {
  private server: net.Server;
  private cacheService: CacheService;
  private port: number;
  private host: string;
  private connections: Set<net.Socket>;

  constructor(cacheService: CacheService, port: number = 6379, host: string = '0.0.0.0') {
    this.cacheService = cacheService;
    this.port = port;
    this.host = host;
    this.connections = new Set();
    this.server = net.createServer();
    this.setupServer();
  }

  private setupServer(): void {
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
              const { data: operation, bytesRead } = Protocol.deserialize(buffer);
              if (process.env.NODE_ENV !== 'test') {
                console.log('Parsed operation:', JSON.stringify(operation));
              }
              buffer = buffer.slice(bytesRead);
              
              const response = await this.handleOperation(operation);
              if (process.env.NODE_ENV !== 'test') {
                console.log('Sending response:', JSON.stringify(response));
              }
              const responseBuffer = Protocol.serialize(response);
              socket.write(responseBuffer);
            } catch (error) {
              // Not enough data for complete message, wait for more
              if (error instanceof Error && error.message.includes('Buffer too small')) {
                break;
              }
              throw error;
            }
          }
        } catch (error) {
          console.error('Error processing client data:', error);
          const errorResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          const responseBuffer = Protocol.serialize(errorResponse);
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

  private async handleOperation(operation: CacheOperation) {
    switch (operation.type) {
      case 'GET':
        return await this.cacheService.get(operation.key!);
      
      case 'SET':
        return await this.cacheService.set(operation.key!, operation.value, operation.ttl);
      
      case 'DELETE':
        return await this.cacheService.delete(operation.key!);
      
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

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`TCP Cache Server listening on ${this.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  stop(): Promise<void> {
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

  getConnectionCount(): number {
    return this.connections.size;
  }
}