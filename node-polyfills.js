// This file provides polyfills for Node.js core modules in React Native
// Import as early as possible in your application

// Import shims
const shims = require('./shims');

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

// Install standard polyfills
global.stream = require('readable-stream');
global.http = require('stream-http');
global.https = require('https-browserify');
global.zlib = require('browserify-zlib');
global.constants = require('constants-browserify');
global.os = require('os-browserify');
global.vm = require('vm-browserify');
global.tty = require('tty-browserify');
global.timers = require('timers-browserify');
global.domain = require('domain-browser');
global.path = require('path-browserify');
global.util = require('util');
global.assert = require('assert');
global.url = require('url');
global.punycode = require('punycode');
global.querystring = require('querystring-es3');
global.string_decoder = require('string_decoder');

// Install custom shims
global.net = shims.net;
global.tls = shims.tls;
global.ws = shims.ws;
global.dgram = shims.dgram;
global.dns = shims.dns;
global.fs = shims.fs;

// Console message to confirm initialization
console.log('Node.js polyfills initialized');