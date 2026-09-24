import {
  ANALYSIS_TIMEOUT_MS,
  ANTHROPIC_API_URL,
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_MODEL,
  ANTHROPIC_VERSION,
  getApiKey,
} from '@/config/anthropic';
import type { SleepEntry } from '@/context/entries-context';
import { durationMinutes } from '@/utils/format';

export type AnalysisStat = { label: string; value: string };
export type AnalysisResult = {
  summary: string;
  stats: AnalysisStat[]; // 2..4 items
  tip: string;
};

export type AnalysisErrorKind =
  | 'missing-key'
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'rate-limited'
  | 'server'
  | 'malformed'
  | 'http';

export class AnalysisError extends Error {
  readonly kind: AnalysisErrorKind;
  readonly status?: number;

  constructor(kind: AnalysisErrorKind, status?: number) {
    super(status ? `${kind} (${status})` : kind); // never carries key or body
    this.name = 'AnalysisError';
    this.kind = kind;
    this.status = status;
  }
}

// Caller-initiated abort (unmount / superseded); never user-visible.
export class AnalysisAborted extends Error {
  constructor() {
    super('aborted');
    this.name = 'AnalysisAborted';
  }
}

const MAX_STATS = 4;

export function buildSystemPrompt(): string {
  return [
    "You are a calm assistant summarizing a baby's recent sleep for a tired parent.",
    'Use plain language. Give no medical advice or diagnosis.',
    'Respond with JSON only: no prose, no code fences.',
    'Use exactly this schema:',
    '{"summary": string, "stats": [{"label": string, "value": string}], "tip": string}',
    'summary: at most 3 sentences. stats: 2 to 4 short label/value pairs. tip: one actionable suggestion.',
  ].join('\n');
}

export function serializeEntries(entries: SleepEntry[]): string {
  return entries
    .map((e, i) => {
      const minutes = durationMinutes(e.sleepTime, e.wakeTime);
      const notes = e.notes ? ` notes: ${JSON.stringify(e.notes)}` : '';
      return `${i + 1}. ${e.date} ${e.sleepTime}->${e.wakeTime} (${minutes}m)${notes}`;
    })
    .join('\n');
}

const isText = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

export function parseAnalysisResult(text: string): AnalysisResult {
  const fenced = /^\s*```(?:json)?\s*([\s\S]*?)```\s*$/.exec(text);
  let data: unknown;
  try {
    data = JSON.parse(fenced ? fenced[1] : text);
  } catch {
    throw new AnalysisError('malformed');
  }
  if (typeof data !== 'object' || data === null) {
    throw new AnalysisError('malformed');
  }
  const { summary, stats, tip } = data as Record<string, unknown>;
  if (!isText(summary) || !isText(tip) || !Array.isArray(stats)) {
    throw new AnalysisError('malformed');
  }
  const parsed: AnalysisStat[] = [];
  for (const s of stats) {
    if (typeof s !== 'object' || s === null) {
      throw new AnalysisError('malformed');
    }
    const { label, value } = s as Record<string, unknown>;
    const v = typeof value === 'number' ? String(value) : value;
    if (!isText(label) || !isText(v)) throw new AnalysisError('malformed');
    parsed.push({ label: label.trim(), value: v.trim() });
  }
  if (parsed.length < 2) throw new AnalysisError('malformed');
  return {
    summary: summary.trim(),
    stats: parsed.slice(0, MAX_STATS),
    tip: tip.trim(),
  };
}

export function errorKindForStatus(status: number): AnalysisErrorKind {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'server';
  return 'http';
}

export async function analyzeEntries(
  entries: SleepEntry[],
  options?: { signal?: AbortSignal },
): Promise<AnalysisResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new AnalysisError('missing-key');

  const signal = options?.signal;
  if (signal?.aborted) throw new AnalysisAborted();

  // The util owns the timer so a caller abort is never mistaken for a timeout.
  const ac = new AbortController();
  let timedOut = false;
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, ANALYSIS_TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: serializeEntries(entries) }],
      }),
      signal: ac.signal,
    });
    if (!res.ok)
      throw new AnalysisError(errorKindForStatus(res.status), res.status);

    const data = await res.json();
    const block = data?.content?.[0];
    if (block?.type !== 'text' || typeof block.text !== 'string') {
      throw new AnalysisError('malformed');
    }
    return parseAnalysisResult(block.text);
  } catch (e) {
    if (e instanceof AnalysisError || e instanceof AnalysisAborted) throw e;
    // Keyed on our own controller, not on the error name, so any abort shape is covered.
    if (ac.signal.aborted) {
      throw timedOut ? new AnalysisError('timeout') : new AnalysisAborted();
    }
    if (e instanceof TypeError) throw new AnalysisError('network');
    throw new AnalysisError('malformed');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
