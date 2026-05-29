/**
 * Smoke-test: run the same SDK calls through both transports and print a
 * side-by-side comparison so you can eyeball that HTTP and MCP behave the same.
 *
 * Requires:
 *   - YMOVE_API_KEY env var
 *   - The local MCP server built: `cd ../mcp-server && npm install && npm run build`
 *
 * Run from /packages/sdk:
 *   npm run test:transports
 *
 * Defaults to the local MCP server at ../mcp-server/dist/index.js. Set
 * MCP_USE_NPX=1 to test the published package via `npx ymove-exercise-mcp`
 * instead - useful once we've shipped to npm.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YMoveClient } from '../src/index';
import { McpTransport } from '../src/mcp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.YMOVE_API_KEY;
if (!apiKey) {
  console.error('Set YMOVE_API_KEY first. Get one at https://ymove.app/exercise-api/signup');
  process.exit(1);
}

const localMcpEntry = path.resolve(__dirname, '../../mcp-server/dist/index.js');
const useNpx = process.env.MCP_USE_NPX === '1';

const http = new YMoveClient(apiKey);
const mcp = new YMoveClient(apiKey, {
  transport: new McpTransport(apiKey, useNpx
    ? { command: 'npx', args: ['ymove-exercise-mcp'] }
    : { command: 'node', args: [localMcpEntry] },
  ),
});

function fmt(label: string, value: unknown) {
  const text =
    typeof value === 'string' ? value :
    Array.isArray(value) ? `[${value.length} items]` :
    typeof value === 'object' && value !== null ? JSON.stringify(value).slice(0, 80) :
    String(value);
  return `  ${label.padEnd(8)} ${text}`;
}

async function compare<T>(name: string, fn: (c: YMoveClient) => Promise<T>, project: (r: T) => unknown) {
  console.log(`\n▸ ${name}`);
  try {
    const [a, b] = await Promise.all([fn(http), fn(mcp)]);
    console.log(fmt('HTTP', project(a)));
    console.log(fmt('MCP', project(b)));
  } catch (err) {
    const e = err as Error;
    console.log(`  ✗ ${e.message}`);
  }
}

async function main() {
  console.log(`Comparing HTTP vs MCP transport (MCP via ${useNpx ? 'npx ymove-exercise-mcp' : `node ${localMcpEntry}`})`);

  await compare(
    'exercises.list({ muscleGroup: "chest", pageSize: 3 })',
    (c) => c.exercises.list({ muscleGroup: 'chest', pageSize: 3 }),
    (r) => `${r.data.length} exercises, first slug: ${r.data[0]?.slug ?? '-'}, total: ${r.pagination.total}`,
  );

  await compare(
    'exercises.get("barbell-back-squat")',
    (c) => c.exercises.get('barbell-back-squat'),
    (r) => `${r.title} · muscle: ${r.muscleGroup} · video: ${r.hasVideo}`,
  );

  await compare(
    'exercises.muscleGroups()',
    (c) => c.exercises.muscleGroups(),
    (r) => `${r.length} muscle groups, first: ${r[0]?.name ?? '-'} (${r[0]?.exerciseCount ?? 0} exercises)`,
  );

  await compare(
    'workouts.generate({ muscleGroup: "chest", exerciseCount: 4 })',
    (c) => c.workouts.generate({ muscleGroup: 'chest', exerciseCount: 4 }),
    (r) => `${r.name} · ${r.exercises.length} exercises · ~${r.estimatedMinutes} min`,
  );

  await compare(
    'programs.generate({ goal: "muscle_building", daysPerWeek: 4, weeks: 4 })',
    (c) => c.programs.generate({ goal: 'muscle_building', daysPerWeek: 4, weeks: 4 }),
    (r) => `${r.name} · split: ${r.split} · ${r.weeklySchedule.length} days/week`,
  );

  await compare(
    'foods.search({ q: "chicken", pageSize: 3 })',
    (c) => c.foods.search({ q: 'chicken', pageSize: 3 }),
    (r) => `${r.data.length} foods, first: ${r.data[0]?.displayName ?? '-'}`,
  );

  await compare(
    'recipes.search({ mealType: "breakfast", pageSize: 3 })',
    (c) => c.recipes.search({ mealType: 'breakfast', pageSize: 3 }),
    (r) => `${r.data.length} recipes, first: ${r.data[0]?.title ?? '-'}`,
  );

  // getUsage is HTTP-only (no MCP tool); show HTTP works and MCP rejects.
  console.log('\n▸ getUsage() [HTTP only - no MCP tool]');
  const usage = await http.getUsage();
  console.log(fmt('HTTP', `${usage.plan} plan · ${usage.minutesUsed}/${usage.minutesLimit} min used (${usage.percentUsed}%)`));
  try {
    await mcp.getUsage();
    console.log('  ✗ unexpected MCP success');
  } catch (err) {
    console.log(`  ✓ MCP correctly threw: ${(err as Error).message.slice(0, 100)}`);
  }

  console.log('\n▸ posture.analyze - expected to fail on MCP (no tool)');
  try {
    await mcp.posture.analyze({
      images: [{ type: 'base64', data: '', media_type: 'image/jpeg' }],
    });
    console.log('  ✗ unexpected success');
  } catch (err) {
    const e = err as Error;
    console.log(`  ✓ MCP correctly threw: ${e.message.slice(0, 100)}`);
  }

  await http.close();
  await mcp.close();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
