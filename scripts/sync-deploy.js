const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Voting panel
const votingDir = path.join(root, 'voting');
copyFile(path.join(publicDir, 'index.html'), path.join(votingDir, 'index.html'));
copyFile(path.join(publicDir, 'app.js'), path.join(votingDir, 'app.js'));
copyFile(path.join(publicDir, 'styles.css'), path.join(votingDir, 'styles.css'));
copyFile(path.join(publicDir, 'ws.js'), path.join(votingDir, 'ws.js'));
copyFile(path.join(publicDir, 'api-client.js'), path.join(votingDir, 'api-client.js'));
copyFile(path.join(publicDir, 'config.js'), path.join(votingDir, 'config.js'));
copyDir(path.join(publicDir, 'images'), path.join(votingDir, 'images'));

// Data panel
const dataDir = path.join(root, 'data');
copyFile(path.join(publicDir, 'results.html'), path.join(dataDir, 'index.html'));
copyFile(path.join(publicDir, 'results.js'), path.join(dataDir, 'results.js'));
copyFile(path.join(publicDir, 'styles.css'), path.join(dataDir, 'styles.css'));
copyFile(path.join(publicDir, 'ws.js'), path.join(dataDir, 'ws.js'));
copyFile(path.join(publicDir, 'api-client.js'), path.join(dataDir, 'api-client.js'));
copyFile(path.join(publicDir, 'config.js'), path.join(dataDir, 'config.js'));

console.log('Synced voting/ and data/ from public/');

// Keep root api/ in sync with voting/api/
const votingApi = path.join(root, 'voting', 'api');
const rootApi = path.join(root, 'api');
if (fs.existsSync(votingApi)) {
  if (fs.existsSync(rootApi)) fs.rmSync(rootApi, { recursive: true, force: true });
  copyDir(votingApi, rootApi);
  console.log('Synced api/ from voting/api/');
}
