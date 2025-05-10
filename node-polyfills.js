// This file provides polyfills for Node.js core modules in React Native
// Import as early as possible in your application

// Essential globals
global.Buffer = require('buffer').Buffer;
global.process = require('process/browser');
global.process.env = global.process.env || {};
global.process.browser = true;
global.process.version = 'v16.0.0'; // Mock Node.js version
global.process.versions = { node: '16.0.0' };

// Make sure crypto library works properly
if (typeof global.crypto !== 'object') {
  global.crypto = require('crypto-browserify');
}

// Network-related modules
global.net = require('./net-shim');
global.tls = require('./tls-shim');
global.http = require('stream-http');
global.https = require('https-browserify');
global.dgram = require('./dgram-shim');
global.dns = require('./dns-shim');

// File system and paths
global.fs = require('./fs-shim');
global.path = require('path-browserify');

// Utilities
global.util = require('util');
global.assert = require('assert');
global.stream = require('readable-stream');
global.zlib = require('browserify-zlib');
global.constants = require('constants-browserify');
global.os = require('os-browserify');
global.vm = require('vm-browserify');
global.tty = require('tty-browserify');
global.timers = require('timers-browserify');
global.domain = require('domain-browser');

// Web-related modules
global.url = require('url');
global.punycode = require('punycode');
global.querystring = require('querystring-es3');
global.string_decoder = require('string_decoder');

// WebSockets
global.ws = require('./ws-shim');

// Console message to confirm initialization
console.log('Node.js polyfills initialized');