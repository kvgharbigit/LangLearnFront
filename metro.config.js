// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Create resolver for Node.js modules
config.resolver = {
  ...config.resolver,
  // Provide fallbacks for Node.js core modules
  extraNodeModules: {
    // Node.js core modules that might be used by dependencies
    'stream': require.resolve('readable-stream'),
    'buffer': require.resolve('buffer'),
    'events': require.resolve('events'),
    'path': require.resolve('path-browserify'),
    'util': require.resolve('util'),
    'crypto': require.resolve('crypto-browserify'),
    'assert': require.resolve('assert'),
  }
};

// Configure the transformer
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;