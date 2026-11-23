// Contract for the run log reader (plan.md § 1). Types only; the reader lives beside this file.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One parsed line of runs/<night>.jsonl.
export type RunLine = {
  at: string; // ISO time, offset as written in the log
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as —
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string; // ISO, the log's offset kept (never converted to UTC)
  lastAt: string; // ISO, the log's offset kept
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[];
  badLines: number; // lines that didn't parse; counted, never thrown
};

/**
 * Reads `<runsDir>/<night>.jsonl` into one row per job, rows sorted by job.
 * Returns null when the file does not exist; an empty file gives `rows: []`.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
