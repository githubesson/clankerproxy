export interface UsageTokenStats {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  total_tokens: number;
}

export interface UsageFailDetail {
  status_code: number;
  body: string;
}

export interface UsageRecord {
  id: string;
  received_at: string;
  timestamp: string;
  provider: string;
  model: string;
  alias: string;
  endpoint: string;
  source: string;
  auth_type: string;
  auth_index: string;
  api_key_preview: string;
  request_id: string;
  reasoning_effort: string;
  service_tier: string;
  latency_ms: number;
  ttft_ms: number;
  tokens: UsageTokenStats;
  failed: boolean;
  fail: UsageFailDetail;
}
