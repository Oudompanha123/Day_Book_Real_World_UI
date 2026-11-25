import type { NextConfig } from "next";

// Where the Spring Boot API runs. Read at build time.
const backend = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // The Docker image sets NEXT_OUTPUT=standalone for a small self-contained server.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Proxy /api/* to Spring Boot so the browser only ever talks to one origin.
  // That keeps the httpOnly login cookie first-party (SameSite=Strict) with no CORS setup.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
