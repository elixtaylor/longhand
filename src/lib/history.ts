/**
 * Recently solved problems, kept in localStorage so a student can pick up
 * where they left off, and shareable links so they can send working to a
 * classmate or hand it to a teacher.
 */

export interface HistoryEntry {
  input: string;
  solverId: string;
  methodId: string;
  at: number;
}

const KEY = 'longhand.history';
const LIMIT = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(list) ? list.filter((e) => typeof e?.input === 'string') : [];
  } catch {
    return [];
  }
}

/** Add an entry, moving a repeat of the same problem back to the top. */
export function pushHistory(entry: HistoryEntry): HistoryEntry[] {
  const existing = loadHistory().filter(
    (e) => !(e.input.trim() === entry.input.trim() && e.solverId === entry.solverId),
  );
  const next = [entry, ...existing].slice(0, LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — history is a convenience, not essential */
  }
  return next;
}

export function clearHistory(): HistoryEntry[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return [];
}

/* ------------------------------------------------------------- share links */

export interface ShareState {
  input: string;
  solverId?: string;
  methodId?: string;
}

/** Encode a problem into a URL fragment. */
export function encodeShare(s: ShareState): string {
  const params = new URLSearchParams();
  params.set('q', s.input);
  if (s.solverId) params.set('t', s.solverId);
  if (s.methodId) params.set('m', s.methodId);
  return `#${params.toString()}`;
}

/** Read a problem back out of the current URL fragment, if there is one. */
export function decodeShare(hash: string): ShareState | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  try {
    const params = new URLSearchParams(raw);
    const input = params.get('q');
    if (!input) return null;
    return {
      input,
      solverId: params.get('t') ?? undefined,
      methodId: params.get('m') ?? undefined,
    };
  } catch {
    return null;
  }
}

export function shareUrl(s: ShareState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${encodeShare(s)}`;
}
