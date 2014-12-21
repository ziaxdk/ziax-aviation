var Writable = require('stream').Writable,
    util = require('util'),
    moment = require('moment'),
    fs = require('fs'),
    Logger = require('./Logger.js');

util.inherits(Pauser, Writable);

var createFilename = function() {
  return './data/D_' + moment().format('DDMMYYYY_HHmmss') + '.txt';
};

function Pauser(options) {
  Writable.call(this, options);
  this.isPaused = false;

  // console.log(this);

  var filename = createFilename();
  Logger.info("Using filename " + filename);
  this.fs = fs.createWriteStream(filename);
  this.num = 1;
  var t = this;

  setInterval(function() {
    Logger.info('Bump....');
    if (t.isPaused) return;
    t.isPaused = true;
  }, 60 * 60 * 1000); // every hour
  // }, 10 * 60 * 1000);  // every 10th minute
  // }, 1000);            // every second

}

Pauser.prototype.pause = function() {
  this.isPaused = true;
};

Pauser.prototype.resume = function() {
  this.isPaused = false;
};

Pauser.prototype._write = function(chunk, encoding, done) {
  // console.log(chunk.toString());
  if (this.isPaused) {
    this.fs.end();
    var filename = createFilename();
    Logger.info("Using filename " + filename);
    this.fs = fs.createWriteStream(filename);
    this.isPaused = false;
  }
  this.fs.write(chunk.toString(), 'UTF-8', done);
};


module.exports = new Pauser();
