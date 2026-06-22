"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Lazily connect to the Socket.io server hosted by our custom Next server. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
