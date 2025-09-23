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
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
function getEnvAsNumber(key, defaultValue) {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
}
function getEnvAsBoolean(key, defaultValue) {
    const value = process.env[key];
    return value ? value.toLowerCase() === 'true' : defaultValue;
}
function getEnvAsString(key, defaultValue) {
    return process.env[key] || defaultValue;
}
exports.config = {
    cache: {
        maxSize: getEnvAsNumber('CACHE_MAX_SIZE', 10000),
        defaultTTL: process.env.CACHE_DEFAULT_TTL ? getEnvAsNumber('CACHE_DEFAULT_TTL', 3600000) : undefined,
        enableMetrics: getEnvAsBoolean('CACHE_ENABLE_METRICS', true),
        maxKeySize: getEnvAsNumber('CACHE_MAX_KEY_SIZE', 256),
        maxValueSize: getEnvAsNumber('CACHE_MAX_VALUE_SIZE', 1048576),
        cleanupInterval: getEnvAsNumber('CLEANUP_INTERVAL', 30000),
    },
    server: {
        http: {
            port: getEnvAsNumber('HTTP_PORT', 8080),
            host: getEnvAsString('HTTP_HOST', '0.0.0.0'),
        },
        maxConnections: getEnvAsNumber('MAX_CONNECTIONS', 1000),
        requestTimeout: getEnvAsNumber('REQUEST_TIMEOUT', 5000),
    },
    nodeEnv: getEnvAsString('NODE_ENV', 'development'),
    logging: {
        level: getEnvAsString('LOG_LEVEL', 'info'),
        format: getEnvAsString('LOG_FORMAT', 'json'),
    },
    security: {
        enableCors: getEnvAsBoolean('ENABLE_CORS', true),
        corsOrigin: getEnvAsString('CORS_ORIGIN', '*'),
        apiRateLimit: getEnvAsNumber('API_RATE_LIMIT', 1000),
    },
    monitoring: {
        enableHealthCheck: getEnvAsBoolean('ENABLE_HEALTH_CHECK', true),
        metricsEndpoint: getEnvAsString('METRICS_ENDPOINT', '/stats'),
        healthEndpoint: getEnvAsString('HEALTH_ENDPOINT', '/health'),
    },
};
//# sourceMappingURL=environment.js.map