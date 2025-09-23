import * as net from 'net';
import { Protocol } from '../utils/protocol';
import { CacheOperation, CacheResponse } from '../types/cache';

export class TCPClient {
  private socket: net.Socket | null;
  private host: string;
  private port: number;
  private connected: boolean;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>;
  private requestId: number;

  constructor(host: string = 'localhost', port: number = 6379) {
    this.socket = null;
    this.host = host;
    this.port = port;
    this.connected = false;
    this.pendingRequests = new Map();
    this.requestId = 0;
  }

  async connect(): Promise<void> {
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

  async sendOperation(operation: CacheOperation): Promise<CacheResponse> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const requestBuffer = Protocol.serialize(operation);
      
      let responseBuffer = Buffer.alloc(0);
      
      const onData = (data: Buffer) => {
        try {
          responseBuffer = Buffer.concat([responseBuffer, data]);
          
          if (responseBuffer.length >= 4) {
            const { data: response } = Protocol.deserialize(responseBuffer);
            this.socket!.removeListener('data', onData);
            resolve(response);
          }
        } catch (error) {
          this.socket!.removeListener('data', onData);
          reject(error);
        }
      };

      this.socket!.on('data', onData);
      this.socket!.write(requestBuffer);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket!.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  async get(key: string): Promise<any> {
    const response = await this.sendOperation({ type: 'GET', key });
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const response = await this.sendOperation({ type: 'SET', key, value, ttl });
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async delete(key: string): Promise<boolean> {
    const response = await this.sendOperation({ type: 'DELETE', key });
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async clear(): Promise<boolean> {
    const response = await this.sendOperation({ type: 'CLEAR' });
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async getStats(): Promise<any> {
    const response = await this.sendOperation({ type: 'STATS' });
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}