# Zencastr Cache Service

A high-performance, production-ready caching service built in TypeScript, similar to Redis or Memcached. Features LRU eviction, TTL support, TCP/HTTP protocols, and comprehensive monitoring.

## Architecture Overview

### Core Components

- **LRU Cache**: O(1) operations using hash map + doubly linked list
- **TTL Support**: Automatic expiration with background cleanup
- **Dual Protocol**: TCP (binary) and HTTP (REST API) servers
- **Modular Design**: Separate concerns for maintainability
- **Production Ready**: Metrics, health checks, graceful shutdown

### Performance Features

- **O(1) Operations**: Get, set, delete operations in constant time
- **Memory Efficient**: Automatic eviction when capacity reached
- **Background Cleanup**: Periodic removal of expired entries
- **Connection Pooling**: Supports multiple concurrent clients
- **Bulk Operations**: Multi-get and multi-set for efficiency

## Quick Start

### Using Docker (Recommended)

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d
```

The service will be available at:
- TCP Server: `localhost:6379`
- HTTP API: `localhost:8080`
- Health Check: `http://localhost:8080/health`

### Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start the server
npm start

# Or run in development mode
npm run dev
```

## Usage Examples

### TCP Client (CLI)

```bash
# Start interactive CLI
npm run client

# Or run performance test
npm run client -- --perf
```

CLI Commands:
```
cache> SET mykey "hello world"
OK
cache> GET mykey
"hello world"
cache> SET temp_key value 5000
OK
cache> STATS
{
  "hits": 1,
  "misses": 0,
  "sets": 2,
  "deletes": 0,
  "evictions": 0,
  "currentSize": 2,
  "hitRate": 1
}
```

### HTTP API

```bash
# Set a value
curl -X POST http://localhost:8080/cache/mykey \
  -H "Content-Type: application/json" \
  -d '{"value": "hello world", "ttl": 3600000}'

# Get a value
curl http://localhost:8080/cache/mykey

# Delete a value
curl -X DELETE http://localhost:8080/cache/mykey

# Get statistics
curl http://localhost:8080/stats

# Bulk operations
curl -X GET "http://localhost:8080/cache/bulk?keys=key1,key2,key3"

curl -X POST http://localhost:8080/cache/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "key1", "value": "value1"},
    {"key": "key2", "value": "value2", "ttl": 5000}
  ]'
```

### Node.js Client

```typescript
import { TCPClient } from './src/client/tcp-client';

const client = new TCPClient();
await client.connect();

// Basic operations
await client.set('key', 'value');
const value = await client.get('key');
await client.delete('key');

// With TTL (milliseconds)
await client.set('temp', 'data', 5000);

// Statistics
const stats = await client.getStats();
console.log(stats);

client.disconnect();
```

## Configuration

### Cache Options

```typescript
const cacheService = new CacheService({
  maxSize: 10000,        // Maximum number of entries
  defaultTTL: 3600000,   // Default TTL in milliseconds (1 hour)
  evictionPolicy: 'lru', // Currently supports 'lru'
  enableMetrics: true    // Enable performance metrics
});
```

### Server Ports

- TCP Server: `6379` (Redis-compatible port)
- HTTP Server: `8080`

## API Reference

### TCP Protocol Commands

| Command | Description | Example |
|---------|-------------|---------|
| `GET <key>` | Retrieve value | `GET mykey` |
| `SET <key> <value> [ttl]` | Set value with optional TTL | `SET mykey value 3600` |
| `DELETE <key>` | Delete key | `DELETE mykey` |
| `CLEAR` | Clear all keys | `CLEAR` |
| `STATS` | Get cache statistics | `STATS` |

### HTTP REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/cache/{key}` | Get value |
| `POST` | `/cache/{key}` | Set value |
| `DELETE` | `/cache/{key}` | Delete key |
| `DELETE` | `/cache` | Clear all |
| `GET` | `/stats` | Get statistics |
| `GET` | `/health` | Health check |
| `GET` | `/cache/bulk?keys=k1,k2` | Bulk get |
| `POST` | `/cache/bulk` | Bulk set |

## Performance Characteristics

### Time Complexity
- **Get**: O(1)
- **Set**: O(1)
- **Delete**: O(1)
- **Eviction**: O(1)

### Benchmarks
On a typical development machine:
- **SET**: ~50,000 ops/sec
- **GET**: ~60,000 ops/sec
- **Memory**: ~1MB for 10,000 string entries

### Production Considerations

1. **Memory Management**: Automatic LRU eviction prevents OOM
2. **TTL Cleanup**: Background process removes expired entries
3. **Connection Limits**: Configure OS limits for high concurrency
4. **Monitoring**: Built-in metrics for observability
5. **Graceful Shutdown**: Handles SIGINT/SIGTERM properly

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- lru-cache.test.ts

# Run tests locally
npm test
```

## Monitoring

### Health Check
```bash
curl http://localhost:8080/health
# Returns: {"success": true, "data": "OK"}
```

### Metrics
```bash
curl http://localhost:8080/stats
```

Returns:
```json
{
  "hits": 1000,
  "misses": 50,
  "sets": 800,
  "deletes": 10,
  "evictions": 5,
  "currentSize": 795,
  "hitRate": 0.952
}
```

## Architecture Deep Dive

### Why LRU as the eviction policy?

LRU (Least Recently Used) eviction is an ideal because users frequently access recent recordings for editing, revisit current projects, and reference recently uploaded content, LRU naturally aligns with these temporal access patterns. Recent recordings are more likely to be accessed again for editing or sharing, user preferences and project metadata benefit from quick retrieval, and the platform's collaborative features mean recently active sessions stay readily available. This makes it an excellent foundation for Zencastr's caching infrastructure, with the flexibility to extend to other eviction policies as specific use cases emerge.

### LRU Implementation
- **Hash Map**: O(1) key lookup
- **Doubly Linked List**: O(1) insertion/deletion
- **Move to Front**: Recently accessed items stay in cache longer

### Memory Layout
```
Cache Node: {
  key: string
  value: any
  prev: Node | null
  next: Node | null
  expiresAt?: number
  createdAt: number
  accessCount: number
}
```

### Eviction Strategy
1. Check TTL on access
2. LRU eviction when at capacity
3. Background cleanup every 30 seconds

### Protocol Design
- **Binary Protocol**: Length-prefixed JSON for TCP
- **HTTP Protocol**: Standard REST API with JSON
- **Error Handling**: Comprehensive error responses

## Development

### Project Structure
```
src/
├── core/           # Cache implementation
│   ├── lru-cache.ts
│   └── cache-service.ts
├── server/         # Network servers
│   ├── tcp-server.ts
│   ├── http-server.ts
│   └── index.ts
├── client/         # Client implementations
│   ├── tcp-client.ts
│   └── cli.ts
├── types/          # TypeScript definitions
│   └── cache.ts
└── utils/          # Utilities
    └── protocol.ts
```


## License

MIT License - see LICENSE file for details.
