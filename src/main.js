const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const console = require("console");
const { layersOrder, format, rarity } = require("./config.js");
const { performance } = require('perf_hooks');

const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

if (!process.env.PWD) {
  process.env.PWD = process.cwd();
}

function nthIndex(str, pat, n){
  var L= str.length, i= -1;
  while(n-- && i++<L){
      i= str.indexOf(pat, i);
      if (i < 0) continue
      else besti = i;
  }
  return besti;
}

const buildDir = `${process.env.PWD}/build`;
const metDataFile = '_metadata.json';
const layersDir = `${process.env.PWD}/layers`;

let metadata = [];
let attributes = [];
let rarityCount = [];
let rarities = [];
let hash = [];
let decodedHash = [];
let layers = [];
let numLayers = 0;
const Exists = new Map();


function addRarity(_str) {
  let itemRarity;

  rarity.forEach((r) => {
    if (_str.includes(r.key)) {
      itemRarity = r.val;
    }
  });

  return itemRarity;
}

function cleanName(_str) {
  let name = _str.slice(0, -4);
  rarity.forEach((r) => {
    name = name.replace(r.key, "");
  });
  return name;
}

function getElements(path) {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      return {
        id: index + 0, // from 0 to n instead of 1 to n+1 for simpler indexing
        name: cleanName(i),
        fileName: i,
        rarity: addRarity(i),
      };
    });
}

function layersSetup(layersOrder) {
  layers = layersOrder.map((layerObj, index) => ({
    id: index,
    name: layerObj.name,
    location: `${layersDir}/${layerObj.name}/`,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    position: { x: 0, y: 0 },
    size: { width: format.width, height: format.height },
    number: layerObj.number // their order from the back, 1 = backest
  }));
  var combinations = 0;
  numLayers = 0;
  layers.forEach(layer => {
    layer.numElements = layer.elements.length;
    rarityCount.push(Array(layer.numElements).fill(0));
    if (combinations == 0) {
      combinations = layer.numElements;
    } else {
      combinations = combinations * layer.numElements;
    }
    numLayers = numLayers + 1;
  });
  console.log('read in ' + layers.length + ' layers with ' + numberWithCommas(combinations) + ' unique combinations');

  return layers;
}

function buildSetup() {
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  else { fs.mkdirSync(buildDir); };
}

function saveLayer(_canvas, _edition) {
  fs.writeFileSync(`${buildDir}/${_edition}.png`, _canvas.toBuffer("image/png"));
}

function addMetadata(_edition) {
  let dateTime = Date.now();
  let tempMetadata = {
    hash: hash.join(""),
    decodedHash: decodedHash,
    edition: _edition,
    date: dateTime,
    attributes: attributes,
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
}

function addAttributes(_element, _layer) {
  let tempAttr = {
    id: _element.id,
    layer: _layer.name,
    name: _element.name,
    rarity: _element.rarity,
  };
  attributes.push(tempAttr);
  rarityCount[_layer.id][_element.id] += 1; // this should be done only after checking for dupes.. same with this whole function?
  console.log(`rarity count [${_layer.id}][${_element.id}] to ${rarityCount[_layer.id][_element.id]}`)
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
}

function addRarities(tempRarities) {
  rarities.push(tempRarities);
}

async function drawLayer(_layer, _edition, _element) {
  if (_element) {

    const image = await loadImage(`${_layer.location}${_element.fileName}`);

    ctx.drawImage(
      image,
      _layer.position.x,
      _layer.position.y,
      _layer.size.width,
      _layer.size.height
    );
    saveLayer(canvas, _edition);
  }
}

const calcRarity = async layers => {
  // pick an asset
  elements = [];
  colors = [];
  await layers.forEach(async (layer) => {
    let colorClash = true
    while (colorClash) {
    randNum = Math.floor(Math.random() * layer.numElements)
    tempElement = layer.elements[randNum].name
    tempColor = tempElement.substring(nthIndex(tempElement,'_',99)+1)
    console.log(tempColor)
    console.log(colors)
    lkupColor = colors.indexOf(tempColor)
    if (lkupColor > -1) {
      console.log('**COLOR CLASH** between [' + layers[lkupColor].name + ':' + layers[lkupColor].elements[lkupColor].name + '] and [' + layer.name + ':' + tempElement + '] redrawing...')
    }
    else {
      elements.push(randNum) // from 0 to n instead of from 1 to n+1 to allow simpler indexing
      colors.push(tempColor)
      colorClash = false
    }
    }
  })
  return elements;
}

async function createFiles(edition, to_draw) {
  layers = layersSetup(layersOrder);
  let numDupes = 0;
  var startTime = performance.now();
  for (let i = 1; i <= edition; i++) {
    let tempRarities = await calcRarity(layers);
    console.log(tempRarities);
    await layers.forEach(async (layer, layerIdx) => {
      // console.log(i + ' layer:')
      // console.log(layer)
      let element = layer.elements[tempRarities[layerIdx]] ? layer.elements[tempRarities[layerIdx]] : null;
      // console.log(element)
      addAttributes(element, layer);
      if (to_draw) { await drawLayer(layer, i, element); }
    });

    // by now it's fully created, so we check for duplicate
    let key = hash.toString();
    if (Exists.has(key)) {
      console.log(
        `Duplicate creation for edition ${i}. Same as edition ${Exists.get(
          key
        )}`
      );
      numDupes++;
      if (numDupes > edition)
        break; //prevents infinite loop if no more unique items can be created
      i--;
    } else {
      Exists.set(key, i);
      addMetadata(i);
      addRarities(tempRarities);
      console.log("Created edition " + i + ' at ' + numberWithCommas(i / (performance.now() - startTime) * 1000 * 60) + ' Elfis/minute');
    }
  }
  console.log('Created ' + edition + ' editions in ' + (performance.now() - startTime) / 1000 + ' seconds\n   numDupes=' + numDupes);
}

function createMetaData() {
  fs.stat(`${buildDir}/${metDataFile}`, (err) => {
    if (err == null || err.code === 'ENOENT') {
      fs.writeFileSync(`${buildDir}/${metDataFile}`, JSON.stringify(metadata, null, 2));
    } else {
      console.log('Oh no, error: ', err.code);
    }
  });
}

function countRarity() {
  // const filledArray = Array(3,3,3).fill(0);
  // let n = metadata.length;
  //   console.log(n)
  //   for (var elfi of metadata) {
  //   }

  // const rarityCount = Array(numLayers).fill(0);
  console.log('counting rarities');
  layers.forEach(async (layer, layerIdx) => {
    // console.log('counting layer ' + layer.id)
    layer.elements.forEach(async (element, elementIdx) => {
      // console.log('counting element ' + element.id);
      numRarity = rarityCount[layer.id][element.id];
      console.log(element.name + ' ' + numRarity + '/' + rarities.length + '=' + numRarity/rarities.length*100 + '%');
    });
  });
}

module.exports = { buildSetup, createFiles, createMetaData, countRarity };
