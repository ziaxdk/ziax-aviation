var bunyan = require('bunyan'),
    log = bunyan.createLogger({
    name: 'foo',
    streams: [{
        type: 'rotating-file',
        path: './logs/ziax-aviation.log',
        period: '1d',
        count: 100
      }]
    });

log.info("Logger ready...");

module.exports = log;

