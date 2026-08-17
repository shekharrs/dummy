const fs = require('fs');
const path = require('path');

const wsUrl = process.env.SNAPVOTE_WS_URL || '';
const votingUrl = process.env.SNAPVOTE_VOTING_URL || '';

const content = `window.SNAPVOTE_WS_URL = ${JSON.stringify(wsUrl)};\n`;

fs.writeFileSync(path.join(__dirname, '..', 'config.js'), content);
console.log('config.js → SNAPVOTE_WS_URL =', wsUrl || '(empty, uses local fallback)');
