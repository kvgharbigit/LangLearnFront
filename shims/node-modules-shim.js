// Combined shim for all Node.js modules
module.exports = {
  net: {
    Socket: class Socket {
      constructor(options) {
        this.options = options || {};
        this.connecting = false;
        this.readable = false;
        this.writable = false;
        
        // Methods
        this.connect = () => this;
        this.end = () => {};
        this.destroy = () => {};
        this.write = () => true;
        this.setNoDelay = () => this;
        this.setKeepAlive = () => this;
        this.setTimeout = () => this;
        this.on = () => this;
        this.once = () => this;
        this.removeListener = () => this;
      }
    },
    
    Server: class Server {
      constructor(options, connectionListener) {
        this.options = options;
        this.connectionListener = connectionListener;
        
        // Methods
        this.listen = () => this;
        this.close = () => {};
        this.on = () => this;
        this.once = () => this;
        this.removeListener = () => this;
      }
    },
    
    createServer: function(options, connectionListener) {
      return new this.Server(options, connectionListener);
    },
    
    createConnection: function(options, connectListener) {
      const socket = new this.Socket(options);
      if (connectListener) {
        socket.on('connect', connectListener);
      }
      return socket;
    },
    
    connect: function() {
      return this.createConnection.apply(this, arguments);
    }
  },
  
  tls: {
    TLSSocket: class TLSSocket {
      constructor(socket, options) {
        this.socket = socket;
        this.options = options;
        this.authorized = true;
        this.authorizationError = null;
        this.encrypted = true;
        
        // Methods
        this.connect = () => this;
        this.end = () => {};
        this.destroy = () => {};
        this.write = () => true;
        this.setNoDelay = () => this;
        this.setKeepAlive = () => this;
        this.setTimeout = () => this;
        this.on = () => this;
        this.once = () => this;
        this.removeListener = () => this;
      }
    },
    
    Server: class Server {
      constructor(options, secureConnectionListener) {
        this.options = options;
        this.secureConnectionListener = secureConnectionListener;
        
        // Methods
        this.listen = () => this;
        this.close = () => {};
        this.on = () => this;
        this.once = () => this;
        this.removeListener = () => this;
      }
    },
    
    createServer: function(options, secureConnectionListener) {
      return new this.Server(options, secureConnectionListener);
    },
    
    connect: function(options, callback) {
      const socket = new this.TLSSocket(null, options);
      if (callback) {
        socket.on('secureConnect', callback);
      }
      return socket;
    },
    
    createSecureContext: function() {
      return {};
    }
  },
  
  ws: {
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
    
    createWebSocketStream: () => ({}),
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
  },
  
  dgram: {
    Socket: class Socket {
      constructor(type, callback) {
        this.type = type;
        if (callback) callback();
        
        // Methods
        this.bind = () => this;
        this.close = () => {};
        this.send = () => {};
        this.address = () => ({ address: '0.0.0.0', port: 0, family: 'IPv4' });
        this.setBroadcast = () => {};
        this.setMulticastTTL = () => {};
        this.setMulticastLoopback = () => {};
        this.addMembership = () => {};
        this.dropMembership = () => {};
        this.ref = () => this;
        this.unref = () => this;
        this.on = () => this;
        this.once = () => this;
        this.removeListener = () => this;
      }
    },
    
    createSocket: function(options, callback) {
      if (typeof options === 'string') {
        options = { type: options };
      }
      return new this.Socket(options.type, callback);
    }
  },
  
  dns: {
    lookup: function(hostname, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      
      setTimeout(() => {
        callback(null, '127.0.0.1', 4);
      }, 0);
    },
    
    lookupService: function(address, port, callback) {
      setTimeout(() => {
        callback(null, 'localhost', 'http');
      }, 0);
    },
    
    Resolver: class Resolver {
      constructor() {
        this.resolve = () => {};
        this.resolve4 = () => {};
        this.resolve6 = () => {};
      }
    }
  },
  
  fs: {
    readFile: function(path, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = { encoding: null, flag: 'r' };
      }
      
      setTimeout(() => {
        callback(new Error('File system access is not available in React Native'));
      }, 0);
    },
    
    writeFile: function(file, data, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = { encoding: 'utf8', mode: 0o666, flag: 'w' };
      }
      
      setTimeout(() => {
        callback(new Error('File system access is not available in React Native'));
      }, 0);
    },
    
    readFileSync: function() {
      throw new Error('File system access is not available in React Native');
    },
    
    writeFileSync: function() {
      throw new Error('File system access is not available in React Native');
    },
    
    createReadStream: function() {
      throw new Error('File system access is not available in React Native');
    },
    
    createWriteStream: function() {
      throw new Error('File system access is not available in React Native');
    },
    
    constants: {
      F_OK: 0,
      R_OK: 4,
      W_OK: 2,
      X_OK: 1
    }
  }
};