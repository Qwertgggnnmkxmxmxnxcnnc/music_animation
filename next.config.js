/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  basePath: '/music_animation',
  assetPrefix: '/music_animation/',
  trailingSlash: true,
  transpilePackages: ['three', 'shader-park-core'],
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader'],
    });
    return config;
  },
}

module.exports = nextConfig 