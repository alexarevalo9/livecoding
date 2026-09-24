export const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_MAX_TOKENS = 1024;
export const ANALYSIS_TIMEOUT_MS = 30_000;
export const ANALYSIS_ENTRY_COUNT = 5;

// Expo inlines EXPO_PUBLIC_* only for a literal `process.env.NAME` member
// expression: no destructuring, no dynamic indexing, no name-taking helper.
export function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}
