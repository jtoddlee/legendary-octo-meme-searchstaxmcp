import { z } from 'zod';
import { SearchStaxError, toToolError } from '../errors.js';
import type { SearchStaxClient } from '../searchstax/types.js';

export const searchstaxSearchInputSchema = z.object({
  query: z.string().min(1),
  rows: z.number().int().min(1).max(100).optional(),
  start: z.number().int().min(0).optional()
});

export type SearchstaxSearchInput = z.infer<typeof searchstaxSearchInputSchema>;

export async function handleSearchstaxSearch(
  client: SearchStaxClient,
  rawInput: unknown
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  try {
    const input = searchstaxSearchInputSchema.parse(rawInput);
    const result = await client.search(input);

    return {
      content: [
        {
          type: 'text',
          text: `Found ${result.total} documents`
        }
      ],
      structuredContent: {
        total: result.total,
        rawTookMs: result.rawTookMs,
        documents: result.documents
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const mapped = new SearchStaxError('Invalid search input', 'validation');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...toToolError(mapped), issues: error.issues.map((i) => i.message) })
          }
        ],
        isError: true
      };
    }

    const mapped = toToolError(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mapped)
        }
      ],
      isError: true
    };
  }
}
