const CANDIDATES = ['Amrit', 'Ashutosh', 'Suranjan', 'Tushar'];
const STATE_KEY = 'snapvote:state';

function defaultState() {
  return {
    tallies: Object.fromEntries(CANDIDATES.map((c) => [c, 0])),
    votes: [],
    logins: [],
  };
}

async function getKv() {
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

export async function readState() {
  const kv = await getKv();
  if (!kv) return defaultState();
  const state = await kv.get(STATE_KEY);
  return state || defaultState();
}

export async function writeState(state) {
  const kv = await getKv();
  if (!kv) throw new Error('KV not configured');
  await kv.set(STATE_KEY, state);
  return state;
}

export function upsertLogin(state, entry) {
  const index = state.logins.findIndex((l) => l.sessionId === entry.sessionId);
  if (index >= 0) {
    state.logins[index] = entry;
  } else {
    state.logins.push(entry);
  }
  return state;
}

export { CANDIDATES, defaultState };
