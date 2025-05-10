// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add Node.js polyfills and package shims
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
    'os': require.resolve('os-browserify'),
    'vm': require.resolve('vm-browserify'),
    'zlib': require.resolve('browserify-zlib'),
    'assert': require.resolve('assert'),
    'util': require.resolve('util'),
    'path': require.resolve('path-browserify'),
    'events': require.resolve('events'),
    'constants': require.resolve('constants-browserify'),
    'tty': require.resolve('tty-browserify'),
    'url': require.resolve('url'),
    'punycode': require.resolve('punycode'),
    'querystring': require.resolve('querystring-es3'),
    'string_decoder': require.resolve('string_decoder'),
    'timers': require.resolve('timers-browserify'),
    'domain': require.resolve('domain-browser'),
    
    // Custom shims for complex modules
    'ws': path.resolve(__dirname, './ws-shim.js'),
    'net': path.resolve(__dirname, './net-shim.js'),
    'tls': path.resolve(__dirname, './tls-shim.js'),
    'dns': path.resolve(__dirname, './dns-shim.js'),
    'dgram': path.resolve(__dirname, './dgram-shim.js'),
    'fs': path.resolve(__dirname, './fs-shim.js'),
  }
};

module.exports = config;