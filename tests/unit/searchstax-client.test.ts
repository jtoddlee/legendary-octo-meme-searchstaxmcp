import { describe, expect, it, vi } from 'vitest';
import { createSearchStaxClient } from '../../src/searchstax/client.js';

describe('createSearchStaxClient', () => {
  it('sends token auth to /emselect with default model/fq query params', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain('/emselect?');
      expect(String(input)).toContain('q=brain');
      expect(String(input)).toContain('rows=10');
      expect(String(input)).toContain('wt=json');
      expect(String(input)).toContain('model=SITE_SEARCH');
      expect(String(input)).toContain('fq=is_preview_b%3Afalse');
      expect(String(input)).toContain('fq=site_name_s%3AUCSF');
      expect(init?.headers).toMatchObject({ Authorization: 'Token token' });

      return new Response(
        JSON.stringify({ response: { docs: [{ id: '1' }], numFound: 1 }, took: 12 }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    });

    const client = createSearchStaxClient({
      baseUrl: 'https://example.com',
      apiToken: 'token',
      timeoutMs: 200,
      retries: 0,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await client.search({ query: 'brain', rows: 10 });
    expect(result.total).toBe(1);
    expect(result.documents).toHaveLength(1);
    expect(result.rawTookMs).toBe(12);
  });

  it('allows overriding model and fq filters', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('model=CUSTOM_MODEL');
      expect(String(input)).toContain('fq=site_name_s%3ADemo');
      expect(String(input)).not.toContain('fq=site_name_s%3AUCSF');

      return new Response(
        JSON.stringify({ response: { docs: [{ id: '2' }], numFound: 1 }, took: 8 }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    });

    const client = createSearchStaxClient({
      baseUrl: 'https://example.com',
      apiToken: 'token',
      timeoutMs: 200,
      retries: 0,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await client.search({
      query: 'brain',
      model: 'CUSTOM_MODEL',
      fq: ['is_preview_b:false', 'site_name_s:Demo']
    });
    expect(result.total).toBe(1);
  });

  it('maps 401 into auth category', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 401 }));

    const client = createSearchStaxClient({
      baseUrl: 'https://example.com',
      apiToken: 'token',
      timeoutMs: 200,
      retries: 0,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(client.search({ query: 'x' })).rejects.toMatchObject({ category: 'auth' });
  });

  it('maps 429 into rate_limit category', async () => {
    const fetchMock = vi.fn(async () => new Response('slow down', { status: 429 }));

    const client = createSearchStaxClient({
      baseUrl: 'https://example.com',
      apiToken: 'token',
      timeoutMs: 200,
      retries: 0,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(client.search({ query: 'x' })).rejects.toMatchObject({ category: 'rate_limit' });
  });
});
