// This file provides polyfills for Node.js core modules in React Native
global.Buffer = require('buffer').Buffer;
global.process = require('process/browser');
global.process.env = global.process.env || {};

// Make sure crypto library works properly
if (typeof global.crypto !== 'object') {
  global.crypto = require('crypto-browserify');
}

// Explicitly patch required Node.js modules
if (typeof global.stream === 'undefined') {
  global.stream = require('readable-stream');
}

if (typeof global.http === 'undefined') {
  global.http = require('stream-http');
}

if (typeof global.https === 'undefined') {
  global.https = require('https-browserify');
}