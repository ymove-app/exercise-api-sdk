/**
 * MCP transport for the YMove SDK (Node-only).
 *
 * Routes SDK calls through the `ymove-exercise-mcp` MCP server instead of
 * direct HTTPS. Useful for verifying parity between the SDK and the MCP
 * surface, and for end-to-end testing in Node environments.
 *
 * @example
 * ```ts
 * import { YMoveClient } from 'ymove-exercise-api';
 * import { McpTransport } from 'ymove-exercise-api/mcp';
 *
 * const transport = new McpTransport(process.env.YMOVE_API_KEY!);
 * const client = new YMoveClient(process.env.YMOVE_API_KEY!, { transport });
 *
 * const { data } = await client.exercises.list({ muscleGroup: 'chest' });
 * await client.close();
 * ```
 *
 * Not browser-safe - depends on Node `child_process` (via the MCP stdio
 * transport). Imports from `ymove-exercise-api/mcp` will fail in browser
 * bundles; that is intentional. Browser/RN clients should use the default
 * `HttpTransport`.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Transport, YMoveError } from './transport';

export interface McpTransportOptions {
  /** Command to spawn. Default: `npx`. */
  command?: string;
  /** Args to pass. Default: `['ymove-exercise-mcp']`. */
  args?: string[];
  /** Extra env vars merged with `YMOVE_API_KEY`. */
  env?: Record<string, string>;
  /** Override the base URL the MCP server hits. Default: production. */
  ymoveBaseUrl?: string;
}

/**
 * Route an SDK request (`path`, `method`, `body`) to the matching MCP
 * `tools/call` (`toolName`, `arguments`). Returns the tool name and the
 * arguments object; the caller invokes the tool and shapes the result.
 *
 * SDK methods with no MCP equivalent throw - these are documented in the
 * README under "MCP transport limitations".
 */
function routeToTool(
  path: string,
  options?: RequestInit,
): { tool: string; args: Record<string, unknown>; responseShape: ResponseShape } {
  const method = (options?.method || 'GET').toUpperCase();
  const body = options?.body ? JSON.parse(options.body as string) : undefined;

  // Strip query string for routing; we'll parse it for args.
  const [pathOnly, queryString] = path.split('?');
  const query: Record<string, unknown> = {};
  if (queryString) {
    for (const [k, v] of new URLSearchParams(queryString)) {
      // Coerce numbers and booleans back from their string form.
      query[k] =
        v === 'true' ? true :
        v === 'false' ? false :
        /^-?\d+(\.\d+)?$/.test(v) ? Number(v) :
        v;
    }
  }

  // Exercises
  if (pathOnly === '/exercises' && method === 'GET') {
    return { tool: 'search_exercises', args: query, responseShape: 'list:exercises' };
  }
  const exMatch = pathOnly.match(/^\/exercises\/(?!muscle-groups|exercise-types)(.+)$/);
  if (exMatch && method === 'GET') {
    return { tool: 'get_exercise', args: { idOrSlug: decodeURIComponent(exMatch[1]) }, responseShape: 'single' };
  }
  if (pathOnly === '/exercises/muscle-groups' && method === 'GET') {
    return { tool: 'list_muscle_groups', args: {}, responseShape: 'raw-array' };
  }
  if (pathOnly === '/exercises/exercise-types' && method === 'GET') {
    return { tool: 'list_exercise_types', args: {}, responseShape: 'raw-array' };
  }

  // Workouts / programs
  if (pathOnly === '/workouts/generate' && method === 'GET') {
    return { tool: 'generate_workout', args: query, responseShape: 'raw' };
  }
  if (pathOnly === '/programs/generate' && method === 'GET') {
    // MCP `weeks` is enum ('4'|'8'|'12'); SDK sends number. Stringify.
    if (typeof query.weeks === 'number') query.weeks = String(query.weeks);
    return { tool: 'generate_program', args: query, responseShape: 'raw' };
  }

  // Foods
  if (pathOnly === '/foods' && method === 'GET') {
    return { tool: 'search_foods', args: query, responseShape: 'list:foods' };
  }
  const foodMatch = pathOnly.match(/^\/foods\/(?!barcode|log)(.+)$/);
  if (foodMatch && method === 'GET') {
    return { tool: 'get_food', args: { id: decodeURIComponent(foodMatch[1]) }, responseShape: 'raw' };
  }
  const upcMatch = pathOnly.match(/^\/foods\/barcode\/(.+)$/);
  if (upcMatch && method === 'GET') {
    return { tool: 'barcode_lookup', args: { upc: decodeURIComponent(upcMatch[1]) }, responseShape: 'raw' };
  }
  if (pathOnly === '/foods/log/text' && method === 'POST') {
    return { tool: 'log_food_text', args: body, responseShape: 'raw' };
  }
  if (pathOnly === '/meals/calculate' && method === 'POST') {
    return { tool: 'calculate_meal', args: body, responseShape: 'raw' };
  }

  // Recipes
  if (pathOnly === '/recipes/search' && method === 'GET') {
    return { tool: 'search_recipes', args: query, responseShape: 'list:recipes' };
  }
  const recipeMatch = pathOnly.match(/^\/recipes\/(?!search|meal-types|diets)(.+)$/);
  if (recipeMatch && method === 'GET') {
    return { tool: 'get_recipe', args: { idOrSlug: decodeURIComponent(recipeMatch[1]) }, responseShape: 'raw' };
  }

  // Unsupported - these endpoints have no MCP tool. Caller catches and surfaces.
  throw new YMoveError(
    `MCP transport: no tool maps to ${method} ${path}. ` +
      `Unsupported via MCP: getUsage, posture.analyze, foods.logPhoto, recipes.mealTypes, recipes.diets. ` +
      `Use HttpTransport for these.`,
    501,
    { path, method },
  );
}

/**
 * The HTTP API returns `{ data: ... }` (single) or `{ data: [...], pagination }` (list).
 * The MCP server inlines results in a stringified JSON text block, and renames
 * `data` → `exercises` / `foods` / `recipes` for list responses. `responseShape`
 * tells the transport how to unwrap each tool's output back to the HTTP shape
 * the SDK expects.
 */
type ResponseShape =
  | 'raw'             // tool returns the object verbatim - wrap in { data: obj }
  | 'raw-array'       // tool returns an array - wrap in { data: arr }
  | 'single'          // tool already returns single shape - wrap in { data: obj }
  | 'list:exercises'  // { exercises, pagination } - rewrite to { data, pagination }
  | 'list:foods'      // { foods, pagination } - rewrite to { data, pagination }
  | 'list:recipes';   // { recipes, pagination } - rewrite to { data, pagination }

function shapeResult(shape: ResponseShape, parsed: any): any {
  switch (shape) {
    case 'raw':
    case 'raw-array':
    case 'single':
      return { data: parsed };
    case 'list:exercises':
      return { data: parsed.exercises, pagination: parsed.pagination };
    case 'list:foods':
      return { data: parsed.foods, pagination: parsed.pagination };
    case 'list:recipes':
      return { data: parsed.recipes, pagination: parsed.pagination };
  }
}

export class McpTransport implements Transport {
  private client?: Client;
  private connectingPromise?: Promise<void>;

  constructor(
    private apiKey: string,
    private options: McpTransportOptions = {},
  ) {}

  private async ensureConnected(): Promise<void> {
    if (this.client) return;
    if (this.connectingPromise) return this.connectingPromise;
    this.connectingPromise = this.connect();
    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = undefined;
    }
  }

  private async connect(): Promise<void> {
    const command = this.options.command ?? 'npx';
    const args = this.options.args ?? ['ymove-exercise-mcp'];
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...this.options.env,
      YMOVE_API_KEY: this.apiKey,
      ...(this.options.ymoveBaseUrl ? { YMOVE_BASE_URL: this.options.ymoveBaseUrl } : {}),
    };

    const transport = new StdioClientTransport({ command, args, env });
    const client = new Client(
      { name: 'ymove-exercise-api-sdk', version: '1.0.0' },
      { capabilities: {} },
    );
    await client.connect(transport);
    this.client = client;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    await this.ensureConnected();
    const { tool, args, responseShape } = routeToTool(path, options);

    const result = await this.client!.callTool({ name: tool, arguments: args });

    if (result.isError) {
      const text = extractText(result);
      throw new YMoveError(`MCP tool ${tool} error: ${text}`, 500, { tool, result });
    }

    const text = extractText(result);
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new YMoveError(`MCP tool ${tool} returned non-JSON: ${text.slice(0, 200)}`, 500, { tool });
    }

    return shapeResult(responseShape, parsed) as T;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = undefined;
    }
  }
}

function extractText(result: any): string {
  const content = result?.content;
  if (!Array.isArray(content)) return '';
  const textParts = content
    .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
    .map((c: any) => c.text);
  return textParts.join('');
}
