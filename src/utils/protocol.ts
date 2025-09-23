import { CacheOperation, CacheResponse } from '../types/cache';

export class Protocol {
  static serialize(data: any): Buffer {
    try {
      const jsonString = JSON.stringify(data);
      const buffer = Buffer.from(jsonString, 'utf8');
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32BE(buffer.length, 0);
      return Buffer.concat([lengthBuffer, buffer]);
    } catch (error) {
      throw new Error(`Serialization failed: ${error}`);
    }
  }

  static deserialize(buffer: Buffer): { data: any; bytesRead: number } {
    try {
      if (buffer.length < 4) {
        throw new Error('Buffer too small for length header');
      }

      const length = buffer.readUInt32BE(0);
      if (buffer.length < 4 + length) {
        throw new Error('Buffer too small for complete message');
      }

      const dataBuffer = buffer.slice(4, 4 + length);
      const jsonString = dataBuffer.toString('utf8');
      const data = JSON.parse(jsonString);
      
      return { data, bytesRead: 4 + length };
    } catch (error) {
      throw new Error(`Deserialization failed: ${error}`);
    }
  }

  static parseCommand(input: string): CacheOperation {
    const parts = this.parseCommandParts(input.trim());
    const command = parts[0].toUpperCase();

    switch (command) {
      case 'GET':
        if (parts.length < 2) throw new Error('GET requires a key');
        return { type: 'GET', key: parts[1] };

      case 'SET':
        if (parts.length < 3) throw new Error('SET requires key and value');
        const ttl = parts[3] ? parseInt(parts[3]) : undefined;
        return { 
          type: 'SET', 
          key: parts[1], 
          value: parts[2],
          ttl: ttl && !isNaN(ttl) ? ttl : undefined
        };

      case 'DELETE':
      case 'DEL':
        if (parts.length < 2) throw new Error('DELETE requires a key');
        return { type: 'DELETE', key: parts[1] };

      case 'CLEAR':
        return { type: 'CLEAR' };

      case 'STATS':
        return { type: 'STATS' };

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  private static parseCommandParts(input: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && /\s/.test(char)) {
        if (current.length > 0) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current.length > 0) {
      parts.push(current);
    }
    
    return parts;
  }

  static formatResponse(response: CacheResponse): string {
    if (!response.success) {
      return `ERROR: ${response.error}`;
    }

    if (response.metrics) {
      return JSON.stringify(response.metrics, null, 2);
    }

    if (response.data === null || response.data === undefined) {
      return '(nil)';
    }

    if (typeof response.data === 'boolean') {
      return response.data ? 'OK' : '(false)';
    }

    if (typeof response.data === 'string') {
      return `"${response.data}"`;
    }

    return JSON.stringify(response.data);
  }
}