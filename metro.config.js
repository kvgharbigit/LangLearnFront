// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Add Node.js polyfills
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    'stream': require.resolve('stream-browserify'),
    // Add other Node.js core modules here if needed
    // 'crypto': require.resolve('crypto-browserify'),
    // 'http': require.resolve('stream-http'),
    // 'https': require.resolve('https-browserify'),
    // 'url': require.resolve('url'),
    // 'zlib': require.resolve('browserify-zlib'),
  },
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