/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.discogs.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // Workaround for issues with Node.js modules using "#" imports.
    // This aliases '#async_hooks' to the Node.js built-in 'async_hooks' module,
    // resolving the "Module not found" error during the build.
    config.resolve.alias['#async_hooks'] = 'async_hooks';
    return config;
  },
};

export default nextConfig;
