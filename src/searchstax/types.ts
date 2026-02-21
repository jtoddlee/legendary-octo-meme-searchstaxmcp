export interface SearchRequest {
  query: string;
  rows?: number;
  start?: number;
  model?: string;
  fq?: string[];
}

export interface SearchResponse {
  documents: Array<Record<string, unknown>>;
  total: number;
  rawTookMs?: number;
}

export interface SearchStaxClient {
  search(input: SearchRequest): Promise<SearchResponse>;
}
