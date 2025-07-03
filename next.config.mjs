/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    unoptimized: true
  },
  webpack(config) {
    config.module.rules.push({
      test: /HeartbeatWorker\.js$/,
      use: 'null-loader'
    });
    return config;
  },
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination:
          'https://api.farcaster.xyz/miniapps/hosted-manifest/0197cdb0-2bbd-c92d-174a-9bca67df8a70',
        permanent: false,
        statusCode: 307
      }
    ];
  }
};

export default nextConfig;
