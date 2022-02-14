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

const buildDir = `${process.env.PWD}/build`;
const metDataFile = '_metadata.json';
const layersDir = `${process.env.PWD}/layers`;

let metadata = [];
let attributes = [];
let hash = [];
let decodedHash = [];
const Exists = new Map();


const addRarity = _str => {
  let itemRarity;

  rarity.forEach((r) => {
    if (_str.includes(r.key)) {
      itemRarity = r.val;
    }
  });

  return itemRarity;
};

const cleanName = _str => {
  let name = _str.slice(0, -4);
  rarity.forEach((r) => {
    name = name.replace(r.key, "");
  });
  return name;
};

const getElements = path => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      return {
        id: index + 1,
        name: cleanName(i),
        fileName: i,
        rarity: addRarity(i),
      };
    });
};

const layersSetup = layersOrder => {
  var layers = layersOrder.map((layerObj, index) => ({
    id: index,
    name: layerObj.name,
    location: `${layersDir}/${layerObj.name}/`,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    position: { x: 0, y: 0 },
    size: { width: format.width, height: format.height },
    number: layerObj.number
  }));
  var combinations = 0;
  layers.forEach(layer => {
    layer.numElements = layer.elements.length
    if (combinations ==0) {
      combinations = layer.numElements;
    } else {
      combinations = combinations * layer.numElements;
    }
  })
  console.log('read in ' + layers.length + ' layers with ' + numberWithCommas(combinations) + ' unique combinations')

  return layers;
};

const buildSetup = () => {
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  else {fs.mkdirSync(buildDir)};
};

const saveLayer = (_canvas, _edition) => {
  fs.writeFileSync(`${buildDir}/${_edition}.png`, _canvas.toBuffer("image/png"));
};

const addMetadata = _edition => {
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
};

const addAttributes = (_element, _layer) => {
  let tempAttr = {
    id: _element.id,
    layer: _layer.name,
    name: _element.name,
    rarity: _element.rarity,
  };
  attributes.push(tempAttr);
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
};

const drawLayer = async (_layer, _edition, _rarity) => {
    if (_rarity) {
      let element =
      _layer.elements[_rarity] ? _layer.elements[_rarity] : null;
      addAttributes(element, _layer);
      const image = await loadImage(`${_layer.location}${element.fileName}`);

      ctx.drawImage(
        image,
        _layer.position.x,
        _layer.position.y,
        _layer.size.width,
        _layer.size.height
      );
      saveLayer(canvas, _edition);
  }
};

const calcRarity = async layers => {
  // pick an asset
  elements = [];
    await layers.forEach(async (layer) => {
    elements.push(Math.floor(Math.random() * layer.number))
  })
  return elements;
}

const createFiles = async edition => {
  const layers = layersSetup(layersOrder);
  let numDupes = 0;
  var startTime = performance.now()
 for (let i = 1; i <= edition; i++) {
   let rarityForAll = await calcRarity(layers);
   console.log(rarityForAll);
   await layers.forEach(async (layer) => { // for each Layer
     await drawLayer(layer, i, rarityForAll[i-1]);
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
     if (numDupes > edition) break; //prevents infinite loop if no more unique items can be created
     i--;
   } else {
     Exists.set(key, i);
     addMetadata(i);
     console.log("Created edition " + i + ' at '+i/(performance.now()-startTime)*1000*60+' Elfis/minute');
   }
 }
};

const createMetaData = () => {
  fs.stat(`${buildDir}/${metDataFile}`, (err) => {
    if(err == null || err.code === 'ENOENT') {
      fs.writeFileSync(`${buildDir}/${metDataFile}`, JSON.stringify(metadata, null, 2));
    } else {
        console.log('Oh no, error: ', err.code);
    }
  });
};

module.exports = { buildSetup, createFiles, createMetaData };
