/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // tesseract.js ships wasm + worker assets; let Next leave them external on the server.
  serverExternalPackages: ["@anthropic-ai/sdk"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
