"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUCache = void 0;
class LRUCache {
    constructor(options) {
        this.maxSize = options.maxSize;
        this.defaultTTL = options.defaultTTL;
        this.enableMetrics = options.enableMetrics ?? true;
        this.maxKeySize = options.maxKeySize ?? 256;
        this.maxValueSize = options.maxValueSize ?? 1024 * 1024; // 1MB default
        this.cache = new Map();
        this.head = null;
        this.tail = null;
        this.size = 0;
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            currentSize: 0,
            hitRate: 0
        };
    }
    get(key) {
        if (!this.isValidKey(key)) {
            return null;
        }
        const node = this.cache.get(key);
        if (!node) {
            this.updateMetrics('miss');
            return null;
        }
        // Check TTL
        if (this.isExpired(node)) {
            this.delete(key);
            this.updateMetrics('miss');
            return null;
        }
        // Move to front (most recently used)
        this.moveToFront(node);
        node.accessCount++;
        this.updateMetrics('hit');
        return node.value;
    }
    set(key, value, ttl) {
        try {
            if (!this.isValidKey(key)) {
                return false;
            }
            if (!this.isValidValue(value)) {
                return false;
            }
            if (!this.isValidTTL(ttl)) {
                return false;
            }
            // Handle zero capacity
            if (this.maxSize === 0) {
                return true; // Pretend success but don't store
            }
            const existingNode = this.cache.get(key);
            if (existingNode) {
                // Update existing node
                existingNode.value = value;
                existingNode.expiresAt = this.calculateExpiry(ttl);
                existingNode.createdAt = Date.now();
                this.moveToFront(existingNode);
            }
            else {
                // Create new node
                const newNode = {
                    key,
                    value,
                    prev: null,
                    next: null,
                    expiresAt: this.calculateExpiry(ttl),
                    createdAt: Date.now(),
                    accessCount: 0
                };
                // Check if we need to evict
                if (this.size >= this.maxSize && this.maxSize > 0) {
                    this.evictLRU();
                }
                this.cache.set(key, newNode);
                this.addToFront(newNode);
                this.size++;
            }
            this.updateMetrics('set');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    delete(key) {
        if (!this.isValidKey(key)) {
            return false;
        }
        const node = this.cache.get(key);
        if (!node) {
            return false;
        }
        this.cache.delete(key);
        this.removeFromList(node);
        this.size--;
        this.updateMetrics('delete');
        return true;
    }
    clear() {
        this.cache.clear();
        this.head = null;
        this.tail = null;
        this.size = 0;
        this.resetMetrics();
    }
    has(key) {
        if (!this.isValidKey(key)) {
            return false;
        }
        const node = this.cache.get(key);
        return node !== undefined && !this.isExpired(node);
    }
    getSize() {
        return this.size;
    }
    getMetrics() {
        this.metrics.currentSize = this.size;
        this.metrics.hitRate = this.metrics.hits + this.metrics.misses > 0
            ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
            : 0;
        return { ...this.metrics };
    }
    // Clean up expired entries
    cleanup() {
        let removed = 0;
        const now = Date.now();
        for (const [key, node] of this.cache.entries()) {
            if (this.isExpired(node, now)) {
                this.delete(key);
                removed++;
            }
        }
        return removed;
    }
    isExpired(node, now) {
        if (!node.expiresAt)
            return false;
        return (now ?? Date.now()) > node.expiresAt;
    }
    calculateExpiry(ttl) {
        const effectiveTTL = ttl ?? this.defaultTTL;
        return effectiveTTL ? Date.now() + effectiveTTL : undefined;
    }
    moveToFront(node) {
        if (this.head === node)
            return;
        this.removeFromList(node);
        this.addToFront(node);
    }
    addToFront(node) {
        node.next = this.head;
        node.prev = null;
        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
    }
    removeFromList(node) {
        if (node.prev) {
            node.prev.next = node.next;
        }
        else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        else {
            this.tail = node.prev;
        }
    }
    evictLRU() {
        if (!this.tail)
            return;
        const keyToEvict = this.tail.key;
        this.cache.delete(keyToEvict);
        this.removeFromList(this.tail);
        this.size--;
        this.updateMetrics('eviction');
    }
    updateMetrics(operation) {
        if (!this.enableMetrics)
            return;
        switch (operation) {
            case 'hit':
                this.metrics.hits++;
                break;
            case 'miss':
                this.metrics.misses++;
                break;
            case 'set':
                this.metrics.sets++;
                break;
            case 'delete':
                this.metrics.deletes++;
                break;
            case 'eviction':
                this.metrics.evictions++;
                break;
        }
    }
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            currentSize: 0,
            hitRate: 0
        };
    }
    isValidKey(key) {
        if (typeof key !== 'string') {
            return false;
        }
        if (key.length === 0 || key.length > this.maxKeySize) {
            return false;
        }
        // Prevent prototype pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            return false;
        }
        // Basic sanitization - prevent null bytes and control characters
        if (/[\x00-\x1F\x7F]/.test(key)) {
            return false;
        }
        return true;
    }
    isValidValue(value) {
        if (value === null || value === undefined) {
            return true; // Allow explicit null/undefined
        }
        // Check value size for strings and objects
        try {
            const serialized = JSON.stringify(value);
            if (serialized && serialized.length > this.maxValueSize) {
                return false;
            }
        }
        catch {
            // If JSON.stringify fails, still allow the value but check basic constraints
            if (typeof value === 'string' && value.length > this.maxValueSize) {
                return false;
            }
        }
        // Prevent prototype pollution in objects - check for dangerous assignments
        if (typeof value === 'object' && value !== null) {
            // Only block if these dangerous properties are being explicitly set
            const keys = Object.keys(value);
            if (keys.includes('__proto__') || keys.includes('prototype')) {
                return false;
            }
            // Check for constructor assignment that could be dangerous
            if (keys.includes('constructor') && value.constructor !== Object && value.constructor !== Array) {
                return false;
            }
        }
        return true;
    }
    isValidTTL(ttl) {
        if (ttl === undefined) {
            return true;
        }
        if (typeof ttl !== 'number' || isNaN(ttl) || !isFinite(ttl)) {
            return false;
        }
        // Prevent negative TTL and extremely large values that could cause overflow
        if (ttl < 0 || ttl > Number.MAX_SAFE_INTEGER) {
            return false;
        }
        return true;
    }
}
exports.LRUCache = LRUCache;
//# sourceMappingURL=lru-cache.js.map