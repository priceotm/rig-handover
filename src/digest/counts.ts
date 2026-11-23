import type { Night } from './types.js';

// retry = sum of row.retries; fail = rows whose lastStatus is 'fail'; ok = rows whose lastStatus is 'ok'.
export function nightCounts(night: Night): { ok: number; retry: number; fail: number } {
  return {
    retry: night.rows.reduce((n, r) => n + r.retries, 0),
    fail: night.rows.filter((r) => r.lastStatus === 'fail').length,
    ok: night.rows.filter((r) => r.lastStatus === 'ok').length,
  };
}
