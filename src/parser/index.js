var fs = require('fs'),
    lazy = require("lazy"),
    loki = require('lokijs'),
    sbs1 = require('sbs1'),
    moment = require('moment'),
    bunyan = require('bunyan'),
    Log = bunyan.createLogger({name: "ziax-sbs1-parser"}),
    Metrics = require('statman');

var db = new loki('./data/adsb.json');
var col = db.addCollection('flight', [ 'id' ]);

// col.insert({id: 1});
// col.insert({id: 2});
// col.insert({id: 3});

// db.save();

// col.insert({ dt: 1000, dt2: moment('2004/01/12 18:00:00.000', 'YYYY/MM/DD HH:mm:ss.SSS').unix() });
// col.insert({ dt: 1500, dt2: moment('2004/01/12 18:01:00.000', 'YYYY/MM/DD HH:mm:ss.SSS').unix() });
// col.insert({ dt: 2000, dt2: moment('2004/01/12 18:02:00.000', 'YYYY/MM/DD HH:mm:ss.SSS').unix() });
// col.insert({ dt: 2500, dt2: moment('2004/01/12 18:03:00.000', 'YYYY/MM/DD HH:mm:ss.SSS').unix() });


// var dt = moment('2004/01/12 18:03:03.000', 'YYYY/MM/DD HH:mm:ss.SSS');
// dt.subtract(160, 'seconds');

// console.log( col.find({ dt2: { '$lt': dt.unix() } } ) );

// return;
// // 
// // 



// MSG,1,111,11111,47831E,111111,2014/12/20,17:29:48.806,2014/12/20,17:29:48.778,SAS7675 ,,,,,,,,,,,0               // Callsign
// MSG,3,111,11111,47831E,111111,2014/12/20,17:29:41.591,2014/12/20,17:29:41.582,,37975,,,55.97050,11.30991,,,,,,0  // Altitude, lat, lon
// MSG,6,111,11111,47831E,111111,2014/12/20,17:29:44.881,2014/12/20,17:29:44.851,,,,,,,,760,0,0,0,0                 // Squawk
// MSG,7,111,11111,47831E,111111,2014/12/20,17:29:42.942,2014/12/20,17:29:42.940,,37975,,,,,,,,,,0                  // Altitude

var lastSeen;

var insertToEs = function(flight) {
  console.log(flight);
  // throw new Error();
};

var removeUnseen = function(msg) {
  if (!lastSeen) {
    lastSeen = msg._msgTime;
    return;
  }

  if (lastSeen.clone().add(120, 'seconds').isBefore(msg._msgTime)) {
    Log.info('Expiring', msg.hex_ident);
    col.find({ lastSeen: { '$lte': msg._msgTime.clone().subtract(120, 'seconds').unix() } } ).forEach(function(f) {
      insertToEs(f);
      col.remove(f);
    });
    lastSeen = msg._msgTime;
    // throw new Error();
  }

};

var processLine = function(line) {
  var msg = sbs1.parseSbs1Message(line.toString()),
      _id = parseInt(msg.hex_ident, 16),
      flight = col.find({ id: _id })[0];
  
  msg._msgTime = moment(msg.logged_date + ' ' + msg.logged_time, 'YYYY/MM/DD HH:mm:ss.SSS');
  Log.debug('Parsing', msg.hex_ident, 'type', msg.transmission_type);

  switch(msg.transmission_type) {
    case 1:
      if (!flight || !flight.callsign) {

        col.insert({
          id: _id,
          hex: msg.hex_ident,
          callsign: msg.callsign,
          path: [],
          lastSeen: msg._msgTime.format()
        });
      }
      else {
        flight.callsign = msg.callsign;
        flight.lastSeen = msg._msgTime.unix();
        col.update(flight);
      }
    break;

    case 3:
      if (!flight) {

        col.insert({
          id: _id,
          hex: msg.hex_ident,
          path: [{
            alt: msg.altitude,
            lat: msg.lat,
            lon: msg.lon,
            time: msg._msgTime.format()
          }],
          lastSeen: msg._msgTime.unix()
        });

      }
      else {

        flight.path.push({
          alt: msg.altitude,
          lat: msg.lat,
          lon: msg.lon,
          time: msg._msgTime
        });
        flight.lastSeen = msg._msgTime.unix();
        col.update(flight);

      }
    break;

    case 6:
      if (!flight || !flight.squawk) {

        col.insert({
          id: _id,
          hex: msg.hex_ident,
          squawk: msg.squawk,
          path: [],
          lastSeen: msg._msgTime.unix()
        });

      }
      else {
        flight.squawk = msg.squawk;
        flight.lastSeen = msg._msgTime.unix();
        col.update(flight);

      }
    break;

  }
  
  removeUnseen(msg);
};

var stopwatch = new Metrics.Stopwatch('duration');
    stopwatch.start();

var file = './data/D_20122014_172941.txt';
var stream = fs.createReadStream(file);
stream.on('end', function() {
  console.log('saving...');
  db.save();
  Log.info("duration", stopwatch.read());
});

new lazy(stream)
  .lines
  .forEach(processLine);