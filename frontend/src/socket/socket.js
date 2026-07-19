// ──────────────────────────────────────────────
// Socket.IO client — real-time communication
// ──────────────────────────────────────────────

import { io } from 'socket.io-client';

// Derive the WS server URL from the API URL (strip trailing /api)
const URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

// Create the socket instance (don't connect automatically — caller controls lifetime)
export const socket = io(URL, {
  autoConnect: false,
});
