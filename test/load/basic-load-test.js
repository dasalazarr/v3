import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.05'],   // Error rate must be less than 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Test health endpoint
  let response = http.get(`${BASE_URL}/health`);
  let result = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(!result);

  sleep(1);

  // Test WhatsApp webhook (simulate message)
  const webhookPayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test-entry',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '1234567890',
            phone_number_id: 'test-id'
          },
          messages: [{
            from: '1234567890',
            id: 'test-message-id',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: {
              body: 'Hello, I ran 5 miles today'
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  });

  response = http.post(`${BASE_URL}/webhook`, webhookPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  result = check(response, {
    'webhook status is 200': (r) => r.status === 200,
    'webhook response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  sleep(2);

  // Test metrics endpoint
  response = http.get(`${BASE_URL}/metrics`);
  result = check(response, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  errorRate.add(!result);

  sleep(1);
}