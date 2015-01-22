var fs = require('fs'),
    lazy = require("lazy"),
    loki = require('lokijs'),
    sbs1 = require('sbs1'),
    moment = require('moment'),
    bunyan = require('bunyan'),
    Log = bunyan.createLogger({name: "ziax-sbs1-parser"}),
    // LogLL = bunyan.createLogger({
    //     name: 'foo',
    //     streams: [{
    //         type: 'rotating-file',
    //         path: './data/ll-log.log',
    //         period: '1d',   // daily rotation
    //         count: 3        // keep 3 back copies
    //     }]
    // }),
    Metrics = require('statman'),
    elasticsearch = require('elasticsearch'),
    client = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'error'
    });


var db = new loki('./data/adsb.json');
// db.loadDatabase({}, function() {
//   var _col = db.getCollection('flight');
//   console.log(db);
// });
// return;
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
  if (flight.path.length === 0) return;
  // var toLeafletPolyline = flight.path.map(function(f) { return [f.lat, f.lon]; });
  // console.log({ id: flight.hex, path: toLeafletPolyline});
  client.index({
    index: 'aviation',
    type: 'flight',
    body: {
      hex: flight.hex,
      latLon: {
        "type": "linestring",
        "coordinates": flight.path.map(function(f) { return [f.lat, f.lon]; })
      },
      path: flight.path,
      callsign: flight.callsign,
      squawk: flight.squawk,
      firstSeen: flight.firstEntry,
      lastSeen: flight.lastEntry
    }
  });
  console.log('Inserting', flight.hex);
  // LogLL.info(toLeafletPolyline);
  // throw new Error();
};

var removeUnseen = function(msg) {
  var minimumTime = msg._msgTime.clone().subtract(120, 'seconds').unix();

  var _expiredFlights = col.find({ lastSeen: { '$lte': minimumTime } } );
  _expiredFlights.forEach(function(expiredFlight) {
    insertToEs(expiredFlight);
    col.remove(expiredFlight);
  });



};

// DEBUG: hex = 45AC52
var processLine = function(line) {
  var msg = sbs1.parseSbs1Message(line.toString());
  
  
  var dbFlights = col.find({ hex: msg.hex_ident }),
      dbFlight = dbFlights[0];

  // if (msg.hex_ident !== '45AC52') return;

  msg._msgTime = moment(msg.logged_date + ' ' + msg.logged_time, 'YYYY/MM/DD HH:mm:ss.SSS');
  Log.debug('Parsing', msg.hex_ident, 'type', msg.transmission_type);

  
  if (dbFlight) {
    dbFlight.lastEntry = msg._msgTime;
    dbFlight.lastSeen = msg._msgTime.unix();
  }
  else {
    dbFlight = {
      hex: msg.hex_ident,
      path: [],
      firstEntry:  msg._msgTime,
      lastEntry: msg._msgTime,
      lastSeen: msg._msgTime.unix()
    };
  }


  switch(msg.transmission_type) {
    case 1:
      if (!dbFlight.callsign) {
        dbFlight.callsign = msg.callsign;
      }
    break;

    case 3:
      dbFlight.path.push({
        alt: msg.altitude,
        lat: msg.lat,
        lon: msg.lon,
        time: msg._msgTime
      });
    break;

    case 6:
      if (!dbFlight.squawk) {
        dbFlight.squawk = msg.squawk;
      }
    break;

  }

  if (dbFlight.meta) {
    col.update(dbFlight);
  }
  else {
    col.insert(dbFlight);
  }
  
  removeUnseen(msg);
};

var stopwatch = new Metrics.Stopwatch('duration');
    stopwatch.start();

var file = './data/D_20122014_172941.txt';
var stream = fs.createReadStream(file);
stream.on('end', function() {
  console.log('saving...');
  setTimeout(function() {
    db.save();
    client.close();
    Log.info("duration", stopwatch.read());
  }, 3000);

});

new lazy(stream)
  .lines
  .forEach(processLine);