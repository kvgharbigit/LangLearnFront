// This is a shim for the 'dns' Node.js module
module.exports = {
  // Lookup functions
  lookup: function(hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    setTimeout(() => {
      // Return a dummy IP address
      callback(null, '127.0.0.1', 4);
    }, 0);
  },
  
  lookupService: function(address, port, callback) {
    setTimeout(() => {
      callback(null, 'localhost', 'http');
    }, 0);
  },
  
  // Resolver class
  Resolver: class Resolver {
    constructor() {
      // Methods
      this.resolve = (hostname, rrtype, callback) => {
        if (typeof rrtype === 'function') {
          callback = rrtype;
          rrtype = 'A';
        }
        
        setTimeout(() => {
          callback(null, ['127.0.0.1']);
        }, 0);
      };
      
      this.resolve4 = (hostname, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        setTimeout(() => {
          callback(null, ['127.0.0.1']);
        }, 0);
      };
      
      this.resolve6 = (hostname, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        setTimeout(() => {
          callback(null, ['::1']);
        }, 0);
      };
    }
  },
  
  // Constants
  NODATA: 'ENODATA',
  FORMERR: 'EFORMERR',
  SERVFAIL: 'ESERVFAIL',
  NOTFOUND: 'ENOTFOUND',
  NOTIMP: 'ENOTIMP',
  REFUSED: 'EREFUSED',
  BADQUERY: 'EBADQUERY',
  BADNAME: 'EBADNAME',
  BADFAMILY: 'EBADFAMILY',
  BADRESP: 'EBADRESP',
  CONNREFUSED: 'ECONNREFUSED',
  TIMEOUT: 'ETIMEOUT',
  EOF: 'EOF',
  FILE: 'EFILE',
  NOMEM: 'ENOMEM',
  DESTRUCTION: 'EDESTRUCTION',
  BADSTR: 'EBADSTR',
  BADFLAGS: 'EBADFLAGS',
  NONAME: 'ENONAME',
  BADHINTS: 'EBADHINTS',
  NOTINITIALIZED: 'ENOTINITIALIZED',
  LOADIPHLPAPI: 'ELOADIPHLPAPI',
  ADDRGETNETWORKPARAMS: 'EADDRGETNETWORKPARAMS',
  CANCELLED: 'ECANCELLED'
};