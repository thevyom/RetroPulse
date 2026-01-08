import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a custom registry
export const metricsRegistry = new Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register: metricsRegistry });

// HTTP Request Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

// WebSocket Metrics
export const websocketConnectionsActive = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [metricsRegistry],
});

export const websocketEventsTotal = new Counter({
  name: 'websocket_events_total',
  help: 'Total number of WebSocket events',
  labelNames: ['event_type', 'direction'],
  registers: [metricsRegistry],
});

// Business Metrics
export const boardsCreatedTotal = new Counter({
  name: 'boards_created_total',
  help: 'Total number of boards created',
  registers: [metricsRegistry],
});

export const cardsCreatedTotal = new Counter({
  name: 'cards_created_total',
  help: 'Total number of cards created',
  labelNames: ['card_type'],
  registers: [metricsRegistry],
});

export const reactionsTotal = new Counter({
  name: 'reactions_total',
  help: 'Total number of reaction operations',
  labelNames: ['action'],
  registers: [metricsRegistry],
});

export const usersJoinedTotal = new Counter({
  name: 'users_joined_total',
  help: 'Total number of user joins to boards',
  registers: [metricsRegistry],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['collection', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [metricsRegistry],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [metricsRegistry],
});

// Error Metrics
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_code', 'endpoint'],
  registers: [metricsRegistry],
});
