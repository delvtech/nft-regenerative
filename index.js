const myArgs = process.argv.slice(2);
const { buildSetup, createFiles, createMetaData, countRarity } = require("./src/main.js");
const { defaultEdition } = require("./src/config.js");
var edition = myArgs.length > 0 ? Number(myArgs[0]) : defaultEdition;
const { performance } = require('perf_hooks');

// (() => {
  buildSetup();
  edition = 10;
  createFiles(edition,to_draw=false).then( () => {
    createMetaData();
    countRarity();
  });
// })();