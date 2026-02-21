import { SearchStaxError } from '../errors.js';
import type { SearchRequest, SearchResponse, SearchStaxClient } from './types.js';

interface ClientOptions {
  baseUrl: string;
  apiToken: string;
  timeoutMs: number;
  retries: number;
  fetchImpl?: typeof fetch;
}

function classifyStatus(status: number): 'auth' | 'rate_limit' | 'upstream_error' {
  if (status === 401 || status === 403) {
    return 'auth';
  }

  if (status === 429) {
    return 'rate_limit';
  }

  return 'upstream_error';
}

export function createSearchStaxClient(options: ClientOptions): SearchStaxClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl.replace(/\/$/, '');

  async function search(input: SearchRequest): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: input.query, wt: 'json' });

    if (typeof input.rows === 'number') {
      params.set('rows', String(input.rows));
    }
    if (typeof input.start === 'number') {
      params.set('start', String(input.start));
    }

    const url = `${base}/select?${params.toString()}`;
    let lastError: unknown;

    for (let attempt = 0; attempt <= options.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);

      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          headers: {
            Authorization: `Token ${options.apiToken}`,
            Accept: 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new SearchStaxError(
            `SearchStax request failed with status ${response.status}`,
            classifyStatus(response.status),
            response.status
          );
        }

        const body = await response.json() as {
          response?: { docs?: Array<Record<string, unknown>>; numFound?: number };
          took?: number;
          docs?: Array<Record<string, unknown>>;
          total?: number;
        };

        const docs = body.response?.docs ?? body.docs ?? [];
        const total = body.response?.numFound ?? body.total ?? docs.length;

        return {
          documents: docs,
          total,
          rawTookMs: typeof body.took === 'number' ? body.took : undefined
        };
      } catch (error) {
        clearTimeout(timer);

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new SearchStaxError('SearchStax request timed out', 'timeout');
        } else {
          lastError = error;
        }

        if (attempt === options.retries) {
          if (lastError instanceof SearchStaxError) {
            throw lastError;
          }
          if (lastError instanceof Error) {
            throw new SearchStaxError(lastError.message, 'upstream_error');
          }
          throw new SearchStaxError('Unknown SearchStax error', 'upstream_error');
        }
      }
    }

    throw new SearchStaxError('Unknown SearchStax error', 'upstream_error');
  }

  return { search };
}
