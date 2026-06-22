# Universal container image — works on Koyeb, Fly.io, Railway, a VPS, or any
# Docker host. Node 24 includes the built-in node:sqlite engine.
FROM node:24-bookworm-slim

WORKDIR /app

# Install all deps (devDeps are needed to build) — keep NODE_ENV unset here.
COPY package.json package-lock.json* ./
RUN npm install

# Build the app
COPY . .
RUN npm run build

ENV PORT=3000
EXPOSE 3000

# `start` sets NODE_ENV=production and launches Next + Socket.io via server.js
CMD ["npm", "run", "start"]
