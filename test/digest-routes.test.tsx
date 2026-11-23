import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

let runsDir: string;

// "zeta-sync" is written before "alpha-backup" on purpose: the output must be sorted by job.
const NORMAL = [
  { at: '2026-11-01T02:00:00+01:00', job: 'zeta-sync', status: 'ok', owner: 'ola' },
  { at: '2026-11-01T02:05:00+01:00', job: 'alpha-backup', status: 'retry', owner: null },
  { at: '2026-11-01T02:10:00+01:00', job: 'alpha-backup', status: 'ok', owner: null },
];

beforeAll(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  fs.writeFileSync(path.join(runsDir, '2026-11-01.jsonl'), NORMAL.map((l) => JSON.stringify(l)).join('\n') + '\n');
  fs.writeFileSync(path.join(runsDir, '2026-11-02.jsonl'), '');
  fs.writeFileSync(
    path.join(runsDir, '2026-11-03.jsonl'),
    [JSON.stringify(NORMAL[0]), 'this is not json', JSON.stringify(NORMAL[1])].join('\n') + '\n',
  );
});

afterAll(() => {
  fs.rmSync(runsDir, { recursive: true, force: true });
});

const app = () =>
  createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });

describe('digest page', () => {
  it('renders a normal night with both jobs', async () => {
    const res = await app().request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('alpha-backup');
    expect(html).toContain('zeta-sync');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app().request('/digest/2026-12-31');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty night file', async () => {
    const res = await app().request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders a night with a bad line, and notes it', async () => {
    const res = await app().request('/digest/2026-11-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    // the apostrophe may be HTML-escaped
    expect(html).toMatch(/1 lines? didn(?:'|&#39;|&apos;|&#x27;)t parse/);
  });
});

describe('digest JSON', () => {
  it('returns night, rows and badLines for a normal night', async () => {
    const res = await app().request('/api/digest/2026-11-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: DigestRow[]; badLines: number };
    expect(body.night).toBe('2026-11-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'zeta-sync']);
    expect(body.rows.find((r) => r.job === 'alpha-backup')?.owner).toBeNull();
  });

  it('lists jobs in the same order as the page', async () => {
    const page = await (await app().request('/digest/2026-11-01')).text();
    const body = (await (await app().request('/api/digest/2026-11-01')).json()) as { rows: DigestRow[] };
    const positions = body.rows.map((r) => page.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('counts a bad line and still answers 200', async () => {
    const res = await app().request('/api/digest/2026-11-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { badLines: number };
    expect(body.badLines).toBe(1);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app().request('/api/digest/2026-12-31');
    expect(res.status).toBe(404);
  });
});
