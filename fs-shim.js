// This is a shim for the 'fs' Node.js module
module.exports = {
  // Basic file operations
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
  
  // Sync versions
  readFileSync: function() {
    throw new Error('File system access is not available in React Native');
  },
  
  writeFileSync: function() {
    throw new Error('File system access is not available in React Native');
  },
  
  // Stream related
  createReadStream: function() {
    throw new Error('File system access is not available in React Native');
  },
  
  createWriteStream: function() {
    throw new Error('File system access is not available in React Native');
  },
  
  // Directory operations
  mkdir: function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = { recursive: false, mode: 0o777 };
    }
    
    setTimeout(() => {
      callback(new Error('File system access is not available in React Native'));
    }, 0);
  },
  
  rmdir: function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    setTimeout(() => {
      callback(new Error('File system access is not available in React Native'));
    }, 0);
  },
  
  // Constants
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1
  }
};