var net = require('net'),
    Recorder = require('./Recorder.js'),
    Logger = require('./Logger.js'),
    MBaseStation = require('./BaseStation.js'),
    BaseStation = new MBaseStation([1,3,6,7]);


net.connect({port: 30003, host: '10.10.10.24' }).pipe(BaseStation).pipe(Recorder);

// https://www.npmjs.com/package/sbs1
// 
// http://www.homepages.mcb.net/bones/SBS/Article/Barebones42_Socket_Data.htm

// var sbs1 = require('sbs1');
// var s = 'MSG,3,496,211,4CA2D6,10057,2008/11/28,14:53:50.594,2008/11/28,14:58:51.153,,37000,,,51.45735,-1.02826,,,0,0,0,0';
//     s = 'MSG,1,111,11111,71BE28,111111,2014/12/18,22:46:46.902,2014/12/18,22:46:46.892,KAL902  ,,,,,,,,,,,0';
//     s = 'MSG,7,111,11111,461F62,111111,2014/12/18,22:46:46.444,2014/12/18,22:46:46.433,,35000,,,,,,,,,,0';
//     s = 'MSG,4,111,11111,869166,111111,2014/12/18,22:46:46.969,2014/12/18,22:46:46.958,,,563,60,,,0,,,,,0';
// var msg = sbs1.parseSbs1Message(s);
// console.log(msg);


// // MSG 1
// // MSG 3
// // MSG 6
// // (MSG 7)
