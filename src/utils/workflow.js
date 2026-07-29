const MAX_RECONNECT_DELAY = 16000;
const completedStatuses = new Set(['APPROVED', 'REJECTED']);

function getReconnectDelay(attempt) {
  return Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY);
}

function getColumnStatus(status) {
  return completedStatuses.has(status) ? 'COMPLETED' : status;
}

function parseSocketMessage(rawData) {
  try {
    const parsed = JSON.parse(rawData);
    return parsed?.type === 'STATUS_UPDATE' ? parsed : null;
  } catch {
    return null;
  }
}

function isSocketOpen(socket) {
  return socket?.readyState === WebSocket.OPEN;
}

export { completedStatuses, getColumnStatus, getReconnectDelay, isSocketOpen, parseSocketMessage };
