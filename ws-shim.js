// This is a shim for the 'ws' package
module.exports = {
  // WebSocket class (minimum implementation)
  WebSocket: class WebSocket {
    constructor(url, protocols) {
      this.url = url;
      this.protocols = protocols;
      this.readyState = 0; // CONNECTING
      this.addEventListener = () => {};
      this.removeEventListener = () => {};
      this.send = () => {};
      this.close = () => {};
    }
  },
  
  // WebSocket server (stub)
  WebSocketServer: class WebSocketServer {
    constructor(options) {
      this.options = options;
      this.clients = new Set();
      this.address = () => ({ port: 0 });
      this.close = () => {};
      this.handleUpgrade = () => {};
      this.shouldHandle = () => true;
    }
  },
  
  // Constants
  createWebSocketStream: () => ({}),
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};