import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket = null;

/**
 * Get or create a Socket.IO connection with JWT auth.
 * Call disconnect() when logging out.
 */
export function getSocket(token) {
  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getCurrentSocket() {
  return socket;
}
