# Zencastr Cache Service

A high-performance, production-ready caching service built in TypeScript, similar to Redis or Memcached. Features LRU eviction, TTL support, HTTP REST API, and comprehensive monitoring.

## Architecture Overview

### Core Components

- **LRU Cache**: O(1) operations using hash map + doubly linked list
- **TTL Support**: Automatic expiration with background cleanup
- **HTTP REST API**: Clean, standard REST interface
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

### CLI

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
import { HTTPClient } from './src/client/http-client';

const client = new HTTPClient();
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

### Server Port

- HTTP Server: `8080`

## API Reference

### CLI Commands

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

The cache implements a sophisticated multi-layered eviction strategy that combines TTL-based expiration with LRU (Least Recently Used) eviction for optimal memory management:

#### 1. TTL-Based Expiration
- **On-Access Validation**: Every GET operation checks if the entry has expired before returning data
- **Automatic Cleanup**: Expired entries are immediately removed when accessed
- **Flexible TTL**: Supports per-key TTL overrides or falls back to default TTL
- **Background Cleanup**: Periodic cleanup process runs every 30 seconds to remove expired entries proactively

```typescript
// TTL validation on every access - src/core/lru-cache.ts:53-57
if (this.isExpired(node)) {
  this.delete(key);
  this.updateMetrics('miss');
  return null;
}
```

#### 2. LRU Eviction Mechanism
- **Capacity Management**: When cache reaches `maxSize`, least recently used items are evicted
- **O(1) Performance**: Uses hash map + doubly linked list for constant-time operations
- **Access Tracking**: Each access moves the item to the front of the list (most recently used)
- **Smart Ordering**: Items naturally migrate to the tail as they become less frequently accessed

```typescript
// Capacity check and LRU eviction - src/core/lru-cache.ts:108-110
if (this.size >= this.maxSize && this.maxSize > 0) {
  this.evictLRU();
}
```

```typescript
// Move accessed items to front - src/core/lru-cache.ts:60-62
this.moveToFront(node);
node.accessCount++;
this.updateMetrics('hit');
```

#### 3. Eviction Process Flow
```
1. New item insertion when at capacity:
   └── Identify LRU item (tail of linked list)
   └── Remove from hash map and linked list
   └── Insert new item at head
   └── Update metrics (evictions counter)

2. Item access (GET operation):
   └── Check TTL expiration first
   └── If expired: remove immediately
   └── If valid: move to front (head) of list
   └── Increment access counter
```

```typescript
// LRU eviction implementation - src/core/lru-cache.ts:233-241
private evictLRU(): void {
  if (!this.tail) return;
  
  const keyToEvict = this.tail.key;
  this.cache.delete(keyToEvict);
  this.removeFromList(this.tail);
  this.size--;
  this.updateMetrics('eviction');
}
```

#### 4. Memory Safety Features
- **Graceful Degradation**: Zero-capacity mode accepts operations but doesn't store data
- **Size Validation**: Enforces maximum key (256 bytes) and value (1MB) sizes
- **Prototype Pollution Protection**: Blocks dangerous object keys (`__proto__`, `constructor`)
- **Input Sanitization**: Prevents null bytes and control characters in keys

```typescript
// Prototype pollution protection - src/core/lru-cache.ts:286-289
if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
  return false;
}
```

```typescript
// Background cleanup process - src/core/cache-service.ts:161-163
this.cleanupInterval = setInterval(() => {
  this.cache.cleanup();
}, 30000);
```

#### 5. Performance Characteristics
- **Eviction Speed**: O(1) - constant time regardless of cache size
- **Memory Efficiency**: Automatic cleanup prevents memory leaks
- **Access Pattern Optimization**: Frequently accessed items stay in cache longer
- **Predictable Behavior**: Deterministic eviction order based on access patterns

### Protocol Design
- **HTTP Protocol**: Standard REST API with JSON
- **Error Handling**: Comprehensive error responses

## Development

### Project Structure
```
src/
├── core/           # Cache implementation
│   ├── lru-cache.ts
│   └── cache-service.ts
├── server/         # Network server
│   ├── http-server.ts
│   └── index.ts
├── client/         # Client implementations
│   ├── http-client.ts   # HTTP client
│   └── cli.ts           # Interactive CLI
├── types/          # TypeScript definitions
│   └── cache.ts
└── utils/          # Utilities
    └── protocol.ts
```


## License

MIT License - see LICENSE file for details.
