// This file should be imported early in your app to provide Node.js polyfills
global.Buffer = require('buffer').Buffer;
global.process = require('process/browser');
global.process.env = global.process.env || {};