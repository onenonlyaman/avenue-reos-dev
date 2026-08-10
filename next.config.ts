import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's client is a native/generated package; bundling it into every route chunk
  // inflates both build memory and cold start. Keep it external on the server.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],

  // Do not advertise the framework version to the internet.
  poweredByHeader: false,

  // Build parallelism. Next defaults to roughly one worker per core, and each worker
  // loads the full route graph — on a small VPS that exhausts memory before it finishes.
  // BUILD_WORKERS lets a constrained host lower this without editing the config.
  experimental: {
    cpus: Number(process.env.BUILD_WORKERS) || 2,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        // Authenticated JSON must never be cached by a shared cache or the browser.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
