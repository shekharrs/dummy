const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.SNAPVOTE_API_URL || '').trim();
const votingUrl = (process.env.SNAPVOTE_VOTING_URL || '').trim();
const isVercel = Boolean(process.env.VERCEL);
const isDataPanel = path.basename(path.join(__dirname, '..')) === 'data';

if (isVercel && isDataPanel && !apiUrl) {
  console.error('\n❌ SNAPVOTE_API_URL is missing on the data panel!');
  console.error('   Set it to your voting project URL, e.g. https://snapvote-voting.vercel.app\n');
  process.exit(1);
}

const lines = [`window.SNAPVOTE_API_URL = ${JSON.stringify(apiUrl)};`];
if (votingUrl) {
  lines.push(`window.SNAPVOTE_VOTING_URL = ${JSON.stringify(votingUrl)};`);
}
lines.push('');

fs.writeFileSync(path.join(__dirname, '..', 'config.js'), lines.join('\n'));
console.log('config.js → SNAPVOTE_API_URL =', apiUrl || '(same origin)');
