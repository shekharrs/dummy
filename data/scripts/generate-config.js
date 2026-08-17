const fs = require('fs');
const path = require('path');

const wsUrl = process.env.SNAPVOTE_WS_URL || '';
const votingUrl = process.env.SNAPVOTE_VOTING_URL || '';

const content = [
  `window.SNAPVOTE_WS_URL = ${JSON.stringify(wsUrl)};`,
  `window.SNAPVOTE_VOTING_URL = ${JSON.stringify(votingUrl)};`,
  '',
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'config.js'), content);
console.log('config.js → SNAPVOTE_WS_URL =', wsUrl || '(empty)');
console.log('config.js → SNAPVOTE_VOTING_URL =', votingUrl || '(empty)');
