// Export all shims
const nodeModules = require('./node-modules-shim');

module.exports = {
  net: nodeModules.net,
  tls: nodeModules.tls,
  ws: nodeModules.ws,
  dgram: nodeModules.dgram,
  dns: nodeModules.dns,
  fs: nodeModules.fs
};