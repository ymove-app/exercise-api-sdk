/**
 * Transport interface for the YMove SDK.
 *
 * The SDK ships with two transports:
 *   - `HttpTransport` (default) - direct HTTPS calls to the ymove API
 *   - `McpTransport` - spawns the `ymove-exercise-mcp` MCP server and routes
 *     calls through it; useful for end-to-end verification that the MCP server
 *     and HTTP API stay in sync. Lives at the `ymove-exercise-api/mcp` sub-path
 *     because it depends on Node's child_process and is not browser-safe.
 *
 * Custom transports (retry policies, request logging, in-process mocks, etc.)
 * can implement this interface and be passed via `new YMoveClient(apiKey, { transport })`.
 */
export interface Transport {
  request<T>(path: string, options?: RequestInit): Promise<T>;
  close?(): Promise<void>;
}

export const DEFAULT_BASE_URL = 'https://exercise-api.ymove.app/api/v2';

export class HttpTransport implements Transport {
  constructor(
    private apiKey: string,
    private baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new YMoveError(
        body.error || body.message || `API error ${res.status}`,
        res.status,
        body,
      );
    }

    return res.json();
  }
}

export class YMoveError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'YMoveError';
    this.status = status;
    this.body = body;
  }
}
