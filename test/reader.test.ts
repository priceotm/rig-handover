import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line, sorted by job', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    expect(night!.night).toBe('2026-10-28');
    expect(night!.badLines).toBe(1);
    const jobs = night!.rows.map((r) => r.job);
    expect(jobs).toHaveLength(5);
    expect(jobs).toEqual([...jobs].sort());
  });

  it('keeps a row whose owner is null', () => {
    const row = readNight('runs', '2026-10-28')!.rows.find((r) => r.job === 'digest/render');
    expect(row).toBeDefined();
    expect(row!.owner).toBeNull();
  });

  it('counts runs and retries and keeps the log offset', () => {
    const row = readNight('runs', '2026-10-28')!.rows.find((r) => r.job === 'fixtures/refresh');
    expect(row).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  describe('temp runs dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('returns null when the night has no file', () => {
      expect(readNight(dir, '2001-01-01')).toBeNull();
    });

    it('gives no rows and no bad lines for an empty file', () => {
      writeFileSync(join(dir, '2001-01-02.jsonl'), '');
      expect(readNight(dir, '2001-01-02')).toEqual({ night: '2001-01-02', rows: [], badLines: 0 });
    });
  });
});

import { nightCounts } from '../src/digest/counts.js';

describe('night counts', () => {
  it('counts run lines per status for 2026-10-28', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night && nightCounts(night)).toEqual({ ok: 10, retry: 4, fail: 1 });
  });
});
