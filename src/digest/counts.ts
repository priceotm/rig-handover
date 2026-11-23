import type { Night } from './types.js';

// Run lines per status for the night: ok + retry + fail = all runs that parsed.
export function nightCounts(night: Night): { ok: number; retry: number; fail: number } {
  const sum = (pick: (r: Night['rows'][number]) => number) => night.rows.reduce((n, r) => n + pick(r), 0);
  const retry = sum((r) => r.retries);
  const fail = sum((r) => r.fails);
  return { ok: sum((r) => r.runs) - retry - fail, retry, fail };
}
