import { describe, expect, it } from 'vitest';
import { searchstaxSearchInputSchema } from '../../src/tools/searchstaxSearch.js';

describe('searchstax search input schema', () => {
  it('accepts valid input', () => {
    const parsed = searchstaxSearchInputSchema.parse({
      query: 'q',
      rows: 5,
      start: 0,
      model: 'SITE_SEARCH',
      fq: ['is_preview_b:false']
    });
    expect(parsed.query).toBe('q');
  });

  it('rejects invalid rows', () => {
    expect(() => searchstaxSearchInputSchema.parse({ query: 'q', rows: 1000 })).toThrow();
  });

  it('rejects empty query', () => {
    expect(() => searchstaxSearchInputSchema.parse({ query: '' })).toThrow();
  });
});
