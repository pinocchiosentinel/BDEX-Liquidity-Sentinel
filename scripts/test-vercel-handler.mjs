import assert from 'node:assert/strict';
import handler from '../api/[...path].mjs';

async function invoke(url, query = {}) {
  const request = { method: 'GET', url, headers: { host: 'localhost' }, query };
  const response = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; },
  };
  await handler(request, response);
  return { status: response.statusCode, headers: response.headers, body: response.body ? JSON.parse(response.body) : null };
}

const healthz = await invoke('/api/healthz');
assert.equal(healthz.status, 200); assert.equal(healthz.body.status, 'ok');
const invalidPool = await invoke('/api/pool/not-an-address');
assert.equal(invalidPool.status, 400);
const notFound = await invoke('/api/no-such-route');
assert.equal(notFound.status, 404);
const method = { method: 'POST', url: '/api/health', headers: { host: 'localhost' } };
const response = { statusCode: 200, headers: {}, body: '', setHeader(n,v){this.headers[n.toLowerCase()]=v;}, end(body){this.body=body;} };
await handler(method, response); assert.equal(response.statusCode, 405);
console.log('Vercel Node handler routing checks passed.');