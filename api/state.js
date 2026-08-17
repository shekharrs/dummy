import { readState } from './_lib/state.js';
import { setCors, handleOptions } from './_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const state = await readState();
    return res.status(200).json(state);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to read state. Is Vercel KV connected?' });
  }
}
