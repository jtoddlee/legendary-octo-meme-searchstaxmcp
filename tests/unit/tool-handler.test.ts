import { describe, expect, it } from 'vitest';
import { SearchStaxError } from '../../src/errors.js';
import { handleSearchstaxSearch } from '../../src/tools/searchstaxSearch.js';
import type { SearchStaxClient } from '../../src/searchstax/types.js';

describe('handleSearchstaxSearch', () => {
  it('returns structured success payload', async () => {
    const client: SearchStaxClient = {
      async search() {
        return { documents: [{ id: '1' }], total: 1, rawTookMs: 7 };
      }
    };

    const result = await handleSearchstaxSearch(client, { query: 'abc' });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.total).toBe(1);
  });

  it('returns safe error payload', async () => {
    const client: SearchStaxClient = {
      async search() {
        throw new SearchStaxError('denied', 'auth');
      }
    };

    const result = await handleSearchstaxSearch(client, { query: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('auth');
    expect(result.content[0].text).not.toContain('Bearer');
  });
});
