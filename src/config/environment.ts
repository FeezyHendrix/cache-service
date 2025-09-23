import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface EnvironmentConfig {
  // Cache Configuration
  cache: {
    maxSize: number;
    defaultTTL?: number;
    enableMetrics: boolean;
    maxKeySize: number;
    maxValueSize: number;
    cleanupInterval: number;
  };
  
  // Server Configuration
  server: {
    tcp: {
      port: number;
      host: string;
    };
    http: {
      port: number;
      host: string;
    };
    maxConnections: number;
    requestTimeout: number;
  };
  
  // Environment
  nodeEnv: string;
  
  // Logging
  logging: {
    level: string;
    format: string;
  };
  
  // Security
  security: {
    enableCors: boolean;
    corsOrigin: string;
    apiRateLimit: number;
  };
  
  // Monitoring
  monitoring: {
    enableHealthCheck: boolean;
    metricsEndpoint: string;
    healthEndpoint: string;
  };
}

function getEnvAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
}

function getEnvAsString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: EnvironmentConfig = {
  cache: {
    maxSize: getEnvAsNumber('CACHE_MAX_SIZE', 10000),
    defaultTTL: process.env.CACHE_DEFAULT_TTL ? getEnvAsNumber('CACHE_DEFAULT_TTL', 3600000) : undefined,
    enableMetrics: getEnvAsBoolean('CACHE_ENABLE_METRICS', true),
    maxKeySize: getEnvAsNumber('CACHE_MAX_KEY_SIZE', 256),
    maxValueSize: getEnvAsNumber('CACHE_MAX_VALUE_SIZE', 1048576),
    cleanupInterval: getEnvAsNumber('CLEANUP_INTERVAL', 30000),
  },
  
  server: {
    tcp: {
      port: getEnvAsNumber('TCP_PORT', 6379),
      host: getEnvAsString('TCP_HOST', '0.0.0.0'),
    },
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