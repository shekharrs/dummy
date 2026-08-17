function getWsUrl() {
  if (window.SNAPVOTE_WS_URL) {
    return window.SNAPVOTE_WS_URL;
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (location.port === '3002') {
    return `${proto}//${location.hostname}:3000`;
  }
  if (location.port) {
    return `${proto}//${location.host}`;
  }
  return `${proto}//${location.hostname}:3000`;
}
