/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = require.resolve('./lib/asyncStorageStub.ts');
    return config;
  }
};

module.exports = nextConfig;
