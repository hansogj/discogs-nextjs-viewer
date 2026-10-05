import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.discogs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gravatar.com",
        port: "",
        pathname: "/avatar/**",
      },
    ],
  },
  webpack: (config) => {
    // Workaround for issues with Node.js modules using "#" imports.
    // This aliases '#async_hooks' to the Node.js built-in 'async_hooks' module,
    // resolving the "Module not found" error during the build.
    config.resolve.alias["#async_hooks"] = "async_hooks";
    return config;
  },
  turbopack: {
    // Mirror the webpack alias so BullMQ's "#async_hooks" import resolves
    // under Turbopack builds (next build now defaults to Turbopack in v16).
    resolveAlias: {
      "#async_hooks": "async_hooks",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
