import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('throws when SEARCHSTAX_API_TOKEN is missing', () => {
    expect(() =>
      loadConfig({
        SEARCHSTAX_BASE_URL: 'https://example.com'
      } as NodeJS.ProcessEnv)
    ).toThrow(/SEARCHSTAX_API_TOKEN/);
  });

  it('throws when SEARCHSTAX_BASE_URL is missing', () => {
    expect(() =>
      loadConfig({
        SEARCHSTAX_API_TOKEN: 'token'
      } as NodeJS.ProcessEnv)
    ).toThrow(/SEARCHSTAX_BASE_URL/);
  });

  it('returns parsed config when valid', () => {
    const config = loadConfig({
      SEARCHSTAX_BASE_URL: 'https://example.com',
      SEARCHSTAX_API_TOKEN: 'token'
    } as NodeJS.ProcessEnv);

    expect(config.SEARCHSTAX_BASE_URL).toBe('https://example.com');
    expect(config.SEARCHSTAX_API_TOKEN).toBe('token');
    expect(config.HTTP_TIMEOUT_MS).toBe(8000);
    expect(config.HTTP_RETRIES).toBe(1);
  });
});
