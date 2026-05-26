import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // ── Image optimisation ──────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Bunny CDN — primary media store
      {
        protocol: "https",
        hostname: "testphotography.b-cdn.net",
        pathname: "/**",
      },
      // Bunny Storage (direct upload URLs)
      {
        protocol: "https",
        hostname: "storage.bunnycdn.com",
        pathname: "/**",
      },
      // Unsplash (login-page gallery panel only — remove in production if not needed)
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // ── Server actions ──────────────────────────────────────────────────────
  experimental: {
    serverActions: {
      // Add your production domain here after deploy, e.g. "memorablepictures.com"
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        ...(process.env.NEXT_PUBLIC_APP_URL
          ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host]
          : []),
      ],
      bodySizeLimit: "50mb", // allow large photo uploads via server actions
    },
  },

  // ── Compression ─────────────────────────────────────────────────────────
  compress: true,

  // ── Power settings ──────────────────────────────────────────────────────
  poweredByHeader: false,

  // ── Webpack ─────────────────────────────────────────────────────────────
  webpack: (config, { isServer }) => {
    // face-api / tfjs reference Node built-ins — client bundle needs fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
      };
    }

    if (isServer) {
      // The face-api browser bundle (face-api.js) ships TF.js bundled inside.
      // We require it explicitly in lib/face-recognition-server.ts for server-side use.
      // Tell webpack to bundle it rather than treat it as an external — this ensures
      // the full TF.js (with CPU fallback) is included in the API route bundle.
      const externals = config.externals;
      if (Array.isArray(externals)) {
        // Keep existing externals but ensure face-api browser bundle is bundled
        config.externals = externals.map((ext: unknown) => {
          if (typeof ext === "function") {
            return (
              ctx: { request?: string },
              callback: (err?: Error | null, result?: string) => void,
            ) => {
              // Bundle the browser bundle so its internal TF.js is included
              if (ctx.request?.includes("face-api/dist/face-api.js")) {
                return callback();
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (ext as any)(ctx, callback);
            };
          }
          return ext;
        });
      }
    }

    // Disable filesystem cache only on Windows dev to prevent rename race conditions.
    // Leave caching enabled in production for faster Vercel/CI builds.
    if (!isProd && process.platform === "win32") {
      config.cache = false;
    }

    // Suppress known harmless warnings from face-api / TF.js
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@vladmandic\/face-api/ },
      { message: /Critical dependency.*bunny/ },
      { message: /require\.extensions/ },
      { message: /node:/ },
    ];

    return config;
  },
};

export default nextConfig;
