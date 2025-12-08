import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import handler from './relay.js';

// Set up environment variable before tests run
process.env.WEBHOOK_TARGETS = 'https://app1.dev/xendit,https://app2.dev/xendit';

describe('Webhook Relay Handler', () => {
  let mock;
  let req;
  let res;

  beforeEach(() => {
    // Setup axios mock
    mock = new MockAdapter(axios);
    
    // Mock request object with async iterator for body
    req = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-callback-token': 'test-token',
      },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('{"id":"test-123","status":"PAID"}');
      },
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    
    // Silence console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('Method Not Allowed');
  });

  it('should return 200 when at least one target succeeds', async () => {
    mock.onPost('https://app1.dev/xendit').reply(200);
    mock.onPost('https://app2.dev/xendit').reply(404);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('should return 500 when all targets return 404', async () => {
    mock.onPost('https://app1.dev/xendit').reply(404);
    mock.onPost('https://app2.dev/xendit').reply(404);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 500 when all targets return 5xx errors', async () => {
    mock.onPost('https://app1.dev/xendit').reply(500);
    mock.onPost('https://app2.dev/xendit').reply(503);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 500 when targets have mixed failures (404 and 5xx)', async () => {
    mock.onPost('https://app1.dev/xendit').reply(404);
    mock.onPost('https://app2.dev/xendit').reply(500);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 200 when one succeeds despite other failures', async () => {
    mock.onPost('https://app1.dev/xendit').reply(200);
    mock.onPost('https://app2.dev/xendit').reply(500);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('should return 500 when all targets timeout', async () => {
    mock.onPost('https://app1.dev/xendit').timeout();
    mock.onPost('https://app2.dev/xendit').timeout();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 200 when all targets succeed', async () => {
    mock.onPost('https://app1.dev/xendit').reply(200);
    mock.onPost('https://app2.dev/xendit').reply(200);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('should return 500 when network errors occur', async () => {
    mock.onPost('https://app1.dev/xendit').networkError();
    mock.onPost('https://app2.dev/xendit').networkError();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });
});
