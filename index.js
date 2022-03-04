const myArgs = process.argv.slice(2);
const { dumpProperties, clearBuildFolder, buildSetup, createFiles, createMetaData, countRarity, showAllPossibleClashes, getColors } = require("./src/main.js");
const { defaultEdition } = require("./src/config.js");
var edition = myArgs.length > 0 ? Number(myArgs[0]) : defaultEdition;
const { performance } = require('perf_hooks');

clearBuildFolder();
buildSetup();
edition = 100;
// createFiles(edition,to_draw=false).then( () => {
//   createMetaData();
//   countRarity();
// });
// showAllPossibleClashes(to_draw=true);
c = getColors()
console.log(c)
d = dumpProperties()
// console.log(d)
dj = JSON.stringify(d)
console.log(dj)
ds = JSON.parse(dj)
console.log(ds)
console.log('k')