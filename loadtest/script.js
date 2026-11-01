import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL;
const VUS = Number(__ENV.VUS || 20);

if (!BASE_URL) {
  throw new Error('Передай BASE_URL через параметр -e');
}

const writeRequests = new Counter('write_requests');
const readRequests = new Counter('read_requests');

export const options = {
  stages: [
    { duration: '3m', target: VUS },
    { duration: '5m', target: VUS },
    { duration: '2m', target: 0 },
  ],
  summaryTrendStats: [
    'avg', 'min', 'med', 'max', 'p(50)', 'p(95)', 'p(99)',
  ],
};

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export default function () {
  // 1 операція запису: оновлення кількості товару в кошику
  const writeResponse = http.put(
    `${BASE_URL}/api/cart/1`,
    JSON.stringify({
      quantity: 1,
      temperature: 'warm-white',
    }),
    {
      headers,
      tags: { operation: 'write' },
    }
  );

  writeRequests.add(1);

  check(writeResponse, {
    'WRITE: cart update returns 200': (r) => r.status === 200,
  });

  // 9 операцій читання
  const reads = [
    { path: '/api/products', name: 'products list' },
    { path: '/api/products/1', name: 'product 1 details' },
    { path: '/api/cart', name: 'cart contents' },
    { path: '/api/orders', name: 'orders list' },
    { path: '/api/products?type=LED', name: 'LED products' },
    { path: '/api/products?manufacturer=LampTech', name: 'manufacturer products' },
    { path: '/api/products?sortBy=price&sortOrder=asc', name: 'sorted products' },
    { path: '/api/products/2', name: 'product 2 details' },
    { path: '/api/products/3', name: 'product 3 details' },
  ];

  for (const endpoint of reads) {
    const response = http.get(
      `${BASE_URL}${endpoint.path}`,
      {
        tags: { operation: 'read', endpoint: endpoint.name },
      }
    );

    readRequests.add(1);

    check(response, {
      [`READ: ${endpoint.name} returns 200`]: (r) => r.status === 200,
    });
  }

  sleep(0.2);
}
