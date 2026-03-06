import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || '';

let socket = null;

export function getSocket(orgId, accessToken) {
  if (socket?.connected && socket.auth?.orgId === orgId) return socket;
  if (socket) socket.disconnect();
  const base = WS_URL || (window.location.port === '5173' ? 'http://localhost:4000' : window.location.origin);
  socket = io(base, {
    path: '/ws',
    auth: { orgId, token: accessToken },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
