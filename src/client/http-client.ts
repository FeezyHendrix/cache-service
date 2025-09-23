import * as http from 'http';

export class HTTPClient {
  private host: string;
  private port: number;
  private baseUrl: string;

  constructor(host: string = 'localhost', port: number = 8080) {
    this.host = host;
    this.port = port;
    this.baseUrl = `http://${host}:${port}`;
  }

  async connect(): Promise<void> {
    // Test connection with health check
    try {
      const response = await this.makeRequest('GET', '/health');
      if (!response.success) {
        throw new Error('Health check failed');
      }
    } catch (error) {
      throw new Error(`Failed to connect to cache server: ${error}`);
    }
  }

  private makeRequest(method: string, path: string, data?: any): Promise<any> {
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
          } catch (error) {
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

  async get(key: string): Promise<any> {
    const response = await this.makeRequest('GET', `/cache/${encodeURIComponent(key)}`);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const data = { value, ttl };
    const response = await this.makeRequest('POST', `/cache/${encodeURIComponent(key)}`, data);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async delete(key: string): Promise<boolean> {
    const response = await this.makeRequest('DELETE', `/cache/${encodeURIComponent(key)}`);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async clear(): Promise<boolean> {
    const response = await this.makeRequest('DELETE', '/cache');
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  }

  async getStats(): Promise<any> {
    const response = await this.makeRequest('GET', '/stats');
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.metrics || response.data;
  }

  disconnect(): void {
    // HTTP client doesn't need persistent connection
  }

  isConnected(): boolean {
    return true; // HTTP is stateless
  }
}