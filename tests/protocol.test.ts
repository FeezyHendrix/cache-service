import { Protocol } from '../src/utils/protocol';

describe('Protocol', () => {
  describe('Serialization', () => {
    test('should serialize and deserialize simple objects', () => {
      const data = { type: 'GET', key: 'test' };
      const buffer = Protocol.serialize(data);
      const { data: deserialized } = Protocol.deserialize(buffer);
      
      expect(deserialized).toEqual(data);
    });

    test('should serialize and deserialize complex objects', () => {
      const data = {
        type: 'SET',
        key: 'complex',
        value: {
          string: 'hello',
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          nested: { deep: { value: 'test' } }
        }
      };
      
      const buffer = Protocol.serialize(data);
      const { data: deserialized } = Protocol.deserialize(buffer);
      
      expect(deserialized).toEqual(data);
    });

    test('should handle empty objects', () => {
      const data = {};
      const buffer = Protocol.serialize(data);
      const { data: deserialized } = Protocol.deserialize(buffer);
      
      expect(deserialized).toEqual(data);
    });

    test('should handle unicode strings', () => {
      const data = { message: 'Hello 世界 🌍' };
      const buffer = Protocol.serialize(data);
      const { data: deserialized } = Protocol.deserialize(buffer);
      
      expect(deserialized).toEqual(data);
    });

    test('should return correct bytes read', () => {
      const data = { test: 'data' };
      const buffer = Protocol.serialize(data);
      const { bytesRead } = Protocol.deserialize(buffer);
      
      expect(bytesRead).toBe(buffer.length);
    });
  });

  describe('Command Parsing', () => {
    test('should parse GET command', () => {
      const command = Protocol.parseCommand('GET mykey');
      expect(command).toEqual({
        type: 'GET',
        key: 'mykey'
      });
    });

    test('should parse SET command without TTL', () => {
      const command = Protocol.parseCommand('SET mykey myvalue');
      expect(command).toEqual({
        type: 'SET',
        key: 'mykey',
        value: 'myvalue'
      });
    });

    test('should parse SET command with TTL', () => {
      const command = Protocol.parseCommand('SET mykey myvalue 3600');
      expect(command).toEqual({
        type: 'SET',
        key: 'mykey',
        value: 'myvalue',
        ttl: 3600
      });
    });

    test('should parse DELETE command', () => {
      const command = Protocol.parseCommand('DELETE mykey');
      expect(command).toEqual({
        type: 'DELETE',
        key: 'mykey'
      });
    });

    test('should parse DEL command (alias)', () => {
      const command = Protocol.parseCommand('DEL mykey');
      expect(command).toEqual({
        type: 'DELETE',
        key: 'mykey'
      });
    });

    test('should parse CLEAR command', () => {
      const command = Protocol.parseCommand('CLEAR');
      expect(command).toEqual({
        type: 'CLEAR'
      });
    });

    test('should parse STATS command', () => {
      const command = Protocol.parseCommand('STATS');
      expect(command).toEqual({
        type: 'STATS'
      });
    });

    test('should handle case insensitive commands', () => {
      const command = Protocol.parseCommand('get mykey');
      expect(command.type).toBe('GET');
    });

    test('should trim whitespace', () => {
      const command = Protocol.parseCommand('  GET   mykey  ');
      expect(command).toEqual({
        type: 'GET',
        key: 'mykey'
      });
    });

    test('should throw error for invalid commands', () => {
      expect(() => Protocol.parseCommand('INVALID')).toThrow('Unknown command: INVALID');
    });

    test('should throw error for GET without key', () => {
      expect(() => Protocol.parseCommand('GET')).toThrow('GET requires a key');
    });

    test('should throw error for SET without value', () => {
      expect(() => Protocol.parseCommand('SET key')).toThrow('SET requires key and value');
    });

    test('should throw error for DELETE without key', () => {
      expect(() => Protocol.parseCommand('DELETE')).toThrow('DELETE requires a key');
    });
  });

  describe('Response Formatting', () => {
    test('should format successful response with data', () => {
      const response = { success: true, data: 'hello' };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toBe('"hello"');
    });

    test('should format successful response with null', () => {
      const response = { success: true, data: null };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toBe('(nil)');
    });

    test('should format successful response with undefined', () => {
      const response = { success: true, data: undefined };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toBe('(nil)');
    });

    test('should format successful response with boolean true', () => {
      const response = { success: true, data: true };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toBe('OK');
    });

    test('should format successful response with boolean false', () => {
      const response = { success: true, data: false };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toBe('(false)');
    });

    test('should format successful response with object', () => {
      const response = { success: true, data: { key: 'value' } };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toBe('{"key":"value"}');
    });

    test('should format error response', () => {
      const response = { success: false, error: 'Something went wrong' };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toBe('ERROR: Something went wrong');
    });

    test('should format response with metrics', () => {
      const response = {
        success: true,
        metrics: {
          hits: 10,
          misses: 2,
          sets: 5,
          deletes: 1,
          evictions: 0,
          currentSize: 9,
          hitRate: 0.83
        }
      };
      const formatted = Protocol.formatResponse(response);
      expect(formatted).toContain('hits');
      expect(formatted).toContain('10');
    });
  });

  describe('Error Handling', () => {
    test('should handle serialization errors gracefully', () => {
      // Create circular reference
      const circular: any = { prop: null };
      circular.prop = circular;
      
      expect(() => Protocol.serialize(circular)).toThrow('Serialization failed');
    });

    test('should handle deserialization errors gracefully', () => {
      const invalidBuffer = Buffer.from('invalid');
      expect(() => Protocol.deserialize(invalidBuffer)).toThrow('Deserialization failed');
    });

    test('should handle buffer too small for length header', () => {
      const smallBuffer = Buffer.from([1, 2]);
      expect(() => Protocol.deserialize(smallBuffer)).toThrow('Buffer too small for length header');
    });

    test('should handle buffer too small for complete message', () => {
      const buffer = Buffer.alloc(8);
      buffer.writeUInt32BE(100, 0); // Claim 100 bytes but only provide 4 more
      
      expect(() => Protocol.deserialize(buffer)).toThrow('Buffer too small for complete message');
    });
  });
});