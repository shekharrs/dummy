import { readState, writeState, CANDIDATES } from './_lib/state.js';
import { setCors, handleOptions } from './_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candidate, voterName, timestamp } = req.body || {};
  if (!CANDIDATES.includes(candidate) || !voterName?.trim()) {
    return res.status(400).json({ error: 'Invalid vote' });
  }

  try {
    const state = await readState();
    const vote = {
      candidate,
      voterName: voterName.trim(),
      timestamp: timestamp || Date.now(),
    };
    state.tallies[candidate] = (state.tallies[candidate] || 0) + 1;
    state.votes.push(vote);
    await writeState(state);
    return res.status(200).json({ ok: true, vote, tallies: state.tallies });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save vote. Is Vercel KV connected?' });
  }
}
