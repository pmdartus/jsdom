"use strict";

const { JSDOM } = require("./lib/api");

new JSDOM(`
  <body>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/EventEmitter/5.2.8/EventEmitter.js"></script>
    <script>
      debugger;
      console.log('I am here');
    </script>
  </body>
`, {
  runScripts: "dangerously"
});
