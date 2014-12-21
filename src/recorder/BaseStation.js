var Transform = require('stream').Transform,
    util = require('util'),
    Logger = require('./Logger.js');


util.inherits(BaseStation, Transform);

function BaseStation(options) {
  Transform.call(this, options);
  this._options = options;

  this._nl = (process.platform === 'win32' ? '\r\n' : '\n');
  Logger.info("BaseStation Transmission messages", options.join());
}

// BaseStation.prototype._write = function(chunk, encoding, done) {
// };

BaseStation.prototype._transform = function (data, encoding, callback) {
  var stringVal = data.toString();
  if (stringVal.indexOf('MSG,') !== 0) {
    Logger.warn('Incomlete line received: ' + stringVal);
    return callback(null, null);
  }
  var _res = [];
  stringVal.split(this._nl).forEach(function(str) {
    var ttype = parseInt(str.substring(4,5));
    if (this._options.indexOf(ttype) !== -1) {
      _res.push(str);
    }
  }, this);

  if (_res.length !== 0) {
    var dd = _res.join(this._nl);
    callback(null, dd + this._nl);
  } else {
    callback(null, null);
  }
};

module.exports = BaseStation;
