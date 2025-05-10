// This is a shim for the 'dgram' Node.js module (UDP sockets)
module.exports = {
  // Socket class (minimal implementation)
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
  
  // Helper functions
  createSocket: function(options, callback) {
    if (typeof options === 'string') {
      options = { type: options };
    }
    return new this.Socket(options.type, callback);
  }
};