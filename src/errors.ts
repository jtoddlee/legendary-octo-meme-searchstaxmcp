export type ErrorCategory = 'auth' | 'rate_limit' | 'timeout' | 'upstream_error' | 'validation';

export class SearchStaxError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode?: number;

  constructor(message: string, category: ErrorCategory, statusCode?: number) {
    super(message);
    this.name = 'SearchStaxError';
    this.category = category;
    this.statusCode = statusCode;
  }
}

export function toToolError(error: unknown): { category: ErrorCategory; message: string } {
  if (error instanceof SearchStaxError) {
    return { category: error.category, message: error.message };
  }

  if (error instanceof Error) {
    return { category: 'upstream_error', message: error.message };
  }

  return { category: 'upstream_error', message: 'Unknown upstream error' };
}
