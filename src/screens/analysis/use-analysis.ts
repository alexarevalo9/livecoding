import { useEffect, useState } from 'react';

import { ANALYSIS_ENTRY_COUNT } from '@/config/anthropic';
import { useEntries, type SleepEntry } from '@/context/entries-context';
import {
  AnalysisAborted,
  AnalysisError,
  analyzeEntries,
  type AnalysisErrorKind,
  type AnalysisResult,
} from '@/utils/anthropic';

export type AnalysisState =
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'success'; result: AnalysisResult }
  | { status: 'error'; kind: AnalysisErrorKind; message: string };

const MESSAGES: Record<AnalysisErrorKind, string> = {
  'missing-key':
    'No API key configured. Add EXPO_PUBLIC_ANTHROPIC_API_KEY to .env.local and restart the dev server.',
  network: "Can't reach the internet. Check your connection and try again.",
  timeout: 'That took too long. Try again.',
  unauthorized:
    'The API key was rejected. Check the key and restart the dev server.',
  'rate-limited': 'Too many requests. Wait a moment and try again.',
  server: 'Claude is having trouble right now. Try again shortly.',
  malformed: "The response couldn't be read. Try again.",
  http: 'Request failed. Try again.',
};

function messageFor(kind: AnalysisErrorKind, status?: number): string {
  return kind === 'http' && status
    ? `Request failed (status ${status}). Try again.`
    : MESSAGES[kind];
}

type Settled = {
  token: string; // input key + nonce the outcome belongs to
  outcome:
    { result: AnalysisResult } | { kind: AnalysisErrorKind; message: string };
};

const analysisInput = (entries: SleepEntry[]) =>
  entries.slice(0, ANALYSIS_ENTRY_COUNT);
const tokenFor = (input: SleepEntry[], nonce: number) =>
  `${input.map((e) => e.id).join('|')}#${nonce}`;

// The visible state is derived at render from the latest settled outcome, so a
// stale token means loading and no setState runs synchronously inside the effect.
// The settled outcome doubles as the in-memory cache: it is reused while the
// 5-entry input and nonce are unchanged (tabs stay mounted between visits).
export function useAnalysis() {
  const { entries } = useEntries();
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    // Derived here (fresh array each render) so [entries, nonce] stays exhaustive.
    const input = analysisInput(entries);
    if (input.length === 0) return;
    const token = tokenFor(input, nonce);

    const controller = new AbortController();
    analyzeEntries(input, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setSettled({ token, outcome: { result } });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted || e instanceof AnalysisAborted) return;
        const kind = e instanceof AnalysisError ? e.kind : 'malformed';
        const status = e instanceof AnalysisError ? e.status : undefined;
        setSettled({
          token,
          outcome: { kind, message: messageFor(kind, status) },
        });
      });
    // Aborts on unmount, input change and refresh; leaving the tab does not unmount.
    return () => controller.abort();
  }, [entries, nonce]);

  const input = analysisInput(entries);
  const refresh = () => setNonce((n) => n + 1);

  let state: AnalysisState;
  if (input.length === 0) {
    state = { status: 'empty' };
  } else if (settled?.token !== tokenFor(input, nonce)) {
    state = { status: 'loading' };
  } else if ('result' in settled.outcome) {
    state = { status: 'success', result: settled.outcome.result };
  } else {
    state = { status: 'error', ...settled.outcome };
  }

  return { state, refresh, inputCount: input.length };
}
