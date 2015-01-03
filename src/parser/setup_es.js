var elasticsearch = require('elasticsearch'),
    client = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'trace'
    });

var done = function() {
  client.close();
  console.log('done...');
};

var index = function() {
  client.indices.create({
    index: 'aviation',
    body: {
      "settings": {
        "index" : {
          "number_of_replicas": 0,
          "number_of_shards": 1
        }
      },

      "mappings": {

        "flight" : {
          "dynamic": "strict",
          "properties" : {
            "hex": {
              "type": "string"
            },
            "callsign": {
              "type": "string"
            },
            "squawk": {
              "type": "integer"
            },
            "latLon": {
              "type": "geo_shape",
              "tree": "quadtree",
              "precision": "10m"
            },
            "path": {
              "type": "object",
              "properties": {
                "alt": {
                  "type": "integer"
                },
                "lat": {
                  "type": "double"
                },
                "lon": {
                  "type": "double"
                },
                "time": {
                  "type": "date"
                }
              }
            },
            "firstSeen": {
              "type": "date"
            },
            "lastSeen": {
              "type": "date"
            }
          }
        }

      }
    }
  }, done);
};

client.indices.delete({ index: 'aviation' })
.then(index, index);


      // hex: flight.hex,
      // latLon: toLeafletPolyline,
      // path: flight.path,
      // callsign: flight.callsign,
      // squawk: flight.squawk

        // alt: msg.altitude,
        // lat: msg.lat,
        // lon: msg.lon,
        // time: msg._msgTime.format()
