var page = require('webpage').create();
page.viewportSize = {
  width: 1920,
  height: 1080
};

// page.open('http://www.ziax.dk', function() {
page.open('http://localhost:3000', function() {
  page.render('example.png');
  phantom.exit();
});