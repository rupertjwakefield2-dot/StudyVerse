/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // tesseract.js ships wasm + worker assets; let Next leave them external on the server.
  serverExternalPackages: ["@anthropic-ai/sdk", "@libsql/client"],
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), payment=(), usb=()",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
