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
    
    // Mock request object
    req = {
      method: 'GET',
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

  it('should return 405 for non-GET requests', async () => {
    req.method = 'POST';
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('Method Not Allowed');
  });

  it('should return 200 when at least one target succeeds', async () => {
    mock.onGet('https://app1.dev/xendit').reply(200);
    mock.onGet('https://app2.dev/xendit').reply(404);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('should return 500 when all targets return 404', async () => {
    mock.onGet('https://app1.dev/xendit').reply(404);
    mock.onGet('https://app2.dev/xendit').reply(404);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 500 when all targets return 5xx errors', async () => {
    mock.onGet('https://app1.dev/xendit').reply(500);
    mock.onGet('https://app2.dev/xendit').reply(503);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 500 when targets have mixed failures (404 and 5xx)', async () => {
    mock.onGet('https://app1.dev/xendit').reply(404);
    mock.onGet('https://app2.dev/xendit').reply(500);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 200 when one succeeds despite other failures', async () => {
    mock.onGet('https://app1.dev/xendit').reply(200);
    mock.onGet('https://app2.dev/xendit').reply(500);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('should return 500 when all targets timeout', async () => {
    mock.onGet('https://app1.dev/xendit').timeout();
    mock.onGet('https://app2.dev/xendit').timeout();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });

  it('should return 200 when all targets succeed', async () => {
    mock.onGet('https://app1.dev/xendit').reply(200);
    mock.onGet('https://app2.dev/xendit').reply(200);
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('should return 500 when network errors occur', async () => {
    mock.onGet('https://app1.dev/xendit').networkError();
    mock.onGet('https://app2.dev/xendit').networkError();
    
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('All targets failed');
  });
});
