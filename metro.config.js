// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Node.js polyfills
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    // Node.js core modules that might be used by dependencies
    'stream': require.resolve('readable-stream'),
    'http': require.resolve('stream-http'),
    'https': require.resolve('https-browserify'),
    'crypto': require.resolve('crypto-browserify'),
    'buffer': require.resolve('buffer'),
    'process': require.resolve('process/browser'),
  }
};

module.exports = config;