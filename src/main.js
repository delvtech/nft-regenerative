const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const console = require("console");
const { layersOrder, format, rarity } = require("./config.js");
const { performance } = require('perf_hooks');
const { newCtx, numberWithCommas, nthIndex} = require('./helpers.js');
const jStat = require("jStat");

if (!process.env.PWD) { process.env.PWD = process.cwd(); }

const buildDir = `${process.env.PWD}/build`;
const metDataFile = '_metadata.json';
const layersDir = `${process.env.PWD}/layers`;
var rows = Array()

let metadata = [];
let attributes = [];
let rarityCount = [];
let rarities = [];
let hash = [];
let decodedHash = [];
let layers = [];
let numLayers = 0;
const Exists = new Map();

function getElements(path,allowNone) {
  elements = fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      let cleanedName = i.substring(3,i.length-4)
      let rarity = cleanedName.substring(nthIndex(cleanedName,'_',99)+2)
      cleanedName = cleanedName.substring(0,nthIndex(cleanedName,'_',99))
      return {
        id: allowNone ? index + 1 : index, // from 0 to n instead of 1 to n+1 for simpler indexing
        name: cleanedName,
        fileName: i,
        color: cleanedName.substring(nthIndex(cleanedName,'_',99)+1).toLowerCase(),
        rarity: parseInt(rarity)
      };
    });
    if (allowNone) {
      elements.unshift({
        id: 0,
        name: 'none',
        fileName: 'none',
        color: 'none',
        rarity: allowNone
      })
    }
  return elements
}

function layersSetup(layersOrder) {
  layers = layersOrder.map((layerObj, index) => ({
    id: index,
    name: layerObj.name,
    location: `${layersDir}/${layerObj.name}/`,
    elements: getElements(`${layersDir}/${layerObj.name}/`,layerObj.allowNone),
    position: { x: 0, y: 0 },
    size: { width: format.width, height: format.height },
    number: layerObj.number // their order from the back, 1 = backest
  }));
  var combinations = 0;
  numLayers = 0;
  layers.forEach(layer => {
    noneRarity = layer.elements.map(e => e.name=='none' ? e.rarity : 0).reduce((s,a)=>s+a,0); // include only 'none element
    actualRarity = layer.elements.map(e => e.name=='none' ? 0 : e.rarity).reduce((s,a)=>s+a,0); // excluding 'none' element
    layer.elements.forEach(e => {
      e.name=='none' ? e.adjustedRarity = e.rarity : e.adjustedRarity = e.rarity * (100 - noneRarity) / actualRarity
    })
    layer.numElements = layer.elements.length;
    rarityCount.push(Array(layer.numElements).fill(0));
    (combinations == 0) ? combinations = layer.numElements : combinations += layer.numElements
    numLayers = numLayers + 1;
  });
  console.log('read in ' + layers.length + ' layers with ' + numberWithCommas(combinations) + ' unique combinations');
  console.log(layers)

  return layers;
}

function clearBuildFolder() {
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  else { fs.mkdirSync(buildDir); };
}

function buildSetup() {
  layers = layersSetup(layersOrder);
}

function saveLayer(_canvas, _edition, _name) {
  fileName = _name ? _name : `${_edition}`
  fullFileName = `${buildDir}/${fileName}.png`
  fs.writeFileSync(fullFileName, _canvas.toBuffer("image/png"));
}

function addMetadata(_edition) {
  let dateTime = Date.now();
  let tempMetadata = {
    hash: hash.join(""),
    decodedHash: decodedHash,
    id: _edition,
    // date: dateTime,
    attributes: attributes,
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
}

function addAttributes(_element, _layer) {
  let tempAttr = {
    // property_id: _element.id,
    trait_type: _layer.name,  // opensea standard
    value: _element.name,     // opensea standard
    rarity: _element.rarity,
    level: Math.random()*100,
    class: 'governatooooor',
    description: _element.description
  };
  attributes.push(tempAttr);
  rarityCount[_layer.id][_element.id] += 1; // this should be done only after checking for dupes.. same with this whole function?
  // console.log(`rarity count [${_layer.id}][${_element.id}] to ${rarityCount[_layer.id][_element.id]}`)
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
}

function addRarities(tempRarities) {
  rarities.push(tempRarities);
}

async function drawLayer(ctx, _layer, _edition, _element, _name) {
  if (_element && _element.name != 'none') {

    const image = await loadImage(`${_layer.location}${_element.fileName}`);

    ctx.drawImage(
      image,
      _layer.position.x,
      _layer.position.y,
      _layer.size.width,
      _layer.size.height
    );
    // console.log(' drawing layer ' + _layer.name)
    saveLayer(ctx.canvas, _edition, _name);
    return 1; // success
  }
}

async function calcRarity(layers) {
  // pick an asset
  elements = [];
  colors = [];
  await layers.forEach(async (layer) => {
    let colorClash = true;
    while (colorClash) {
      randNum = Math.random()
      cumsum=0
      i = 0
      while (cumsum < randNum*100) {
        cumsum = cumsum + layer.elements[i].adjustedRarity
        chosenElement=i
        i++
      }
      tempElement = layer.elements[chosenElement];
      if (debug) console.log(`${cumsum} vs. ${randNum*100} gives ${layer.name}:${tempElement.name}`)
      tempColor = tempElement.color;
      if (debug) console.log(tempColor)
      if (debug) console.log(colors)
      lkupColor = colors.indexOf(tempColor);
      if (lkupColor < -1) { // ignore matches to background and weapons
        if (debug) console.log('**COLOR CLASH** between [' + layers[lkupColor].name + ':' + layers[lkupColor].elements[elements[lkupColor]].name + '] and [' + layer.name + ':' + tempElement.name + '] redrawing...')
      }
      else {
        elements.push(chosenElement); // from 0 to n instead of from 1 to n+1 to allow simpler indexing
        colors.push(tempColor);
        colorClash = false;
      }
    }
  });
  return elements;
}

async function createFiles(edition, to_draw, rarity, name, debug) {
  let numDupes = 0;
  var startTime = performance.now();
  for (let i = 1; i <= edition; i++) {
    let tempRarities = rarity ? rarity : await calcRarity(layers,debug);
    if (debug) console.log(tempRarities)
    ctx = newCtx(format.width,format.height)
    layers.forEach(async (layer, layerIdx) => {
      let element = layer.elements[tempRarities[layerIdx]] ? layer.elements[tempRarities[layerIdx]] : null;
      addAttributes(element, layer);
      if (to_draw) r = await drawLayer(ctx, layer, i, element, name)
    });

    // by now it's fully created, so we check for duplicate
    let key = hash.toString();
    if (Exists.has(key)) { // we find a duplicate
      console.log(`Duplicate creation for edition ${i}. Same as edition ${Exists.get(key)}`);
      numDupes++;
      if (numDupes > edition) break; //prevents infinite loop if no more unique items can be created
      i--;
    } else { // it's unique
      Exists.set(key, i);
      addMetadata(i);
      addRarities(tempRarities);
      if (i % 100 == 0) console.log("Created edition " + i + ' at ' + numberWithCommas(Math.round(i / (performance.now() - startTime) * 1000 * 60)) + ' Elfis/minute');
    }
  }
  console.log('Created ' + edition + ' editions in ' + (performance.now() - startTime) / 1000 + ' seconds\n   numDupes=' + numDupes);
  return 1;
}

function createMetaData() {
  fs.writeFileSync(`${buildDir}\\${metDataFile}`, JSON.stringify(metadata, null, 2));
}

function displayRarity() {
  totalNum = 0;
  console.log('== displaying rarities ==');
  layers.forEach(async (layer, layerIdx) => {
    console.log(`= displaying rarities for layer ${layer.id} =`)
    layer.elements.forEach(async (element, elementIdx) => {
      numRarity = rarityCount[layer.id][element.id];
      if (layerIdx==0) totalNum += numRarity;
      z = (numRarity / rarities.length - element.adjustedRarity/100)/Math.sqrt((element.adjustedRarity/100)*(1-element.adjustedRarity/100)/rarities.length)
      pvalue = 1 - jStat.normal.cdf(Math.abs(z),0,1);
      res = pvalue < 0.05 ? ' *REJECT' : '';
      console.log(`${element.name} actual: ${numRarity}/${rarities.length}=${numRarity / rarities.length * 100}%, raw: ${element.rarity}, adjusted: ${element.adjustedRarity}, pvalue: ${pvalue}${res}`);
    });
  });
  console.log(`total elements counted: ${totalNum}`)
}

async function showAllPossibleClashes(to_draw=false) {
  layers.forEach(async (layer1, layerIdx1) => { // for each layer1
    if (layerIdx1 < 2) {
    layers.forEach(async (layer2, layerIdx2) => { // for each layer2
      if (layerIdx2 > layerIdx1) { // consider only upper half of 2d matrix excluding identity
        colors = layer1.elements.map(element => { return element.color }) // create color map for layer1
        layer2.elements.forEach(async (element,elementIdx) => { // for each element in layer2, check if color clash
          lkupColor = colors.indexOf(element.color) // do we find this element in the colormap?
          if (lkupColor > -1 && element.color!='none') { // if we do, freak out
            console.log(element.color)
            console.log(element.color=='none')
            console.log(element.color!='none')
            console.log('*POSSIBLE COLOR CLASH* between [' + layer1.name + ':' + layer1.elements[lkupColor].name + '] and [' + layer2.name + ':' + element.name + ']')
            if (to_draw) {
              tempRarities = Array(numLayers).fill(0)
              tempRarities[layerIdx1]=lkupColor
              tempRarities[layerIdx2]=elementIdx
              fileName = '' + layer1.name + '_' + layer1.elements[lkupColor].name + '-' + layer2.name + '_' + element.name + ''
              // console.log(fileName)
              r = await createFiles(1, to_draw=true, rarities = tempRarities, fileName);
              console.log('success ' + fileName)
            } // end if to_draw
          }
        })        
      } // continue if not in upper half of 2d matrix ecluding identity
    }) // end for each layer2
    } // end if
  }) // end for each layer1
}

function getColors() {
  var res = {}
  layers.map( (l) => {
    m = [...new Set(l.elements.map( e => {
      return e.color
    }))]
    res[l.name]=m
  })
  return res
}

function dumpProperties() {
  var names = {}
  layers.map( (l) => {
    let newRow = l.elements.map( e => {
      res = []
      res.push(l.id)
      res.push(...Object.values(e))
      return res
    })
    names[l.name]=newRow[0]
    rows.push(...newRow)
  })
  let csvContent = 'layer,' + Object.keys(layers[0].elements[0]).join(',')+'\n'
  csvContent += rows.map(e => {return e.join(',')+'\n'})
  csvContent = csvContent.replaceAll('\n,','\n')
  fs.writeFileSync('layers.csv',csvContent)
  return {names,rows}
}

function readProperties() {
  var l = fs.readFileSync('layers_with_descriptions.csv').toString().split('\n')
  l=l.splice(1,l.length-2)
  l.forEach( (e,i) => {
    let row = e.split(',')
    let layer = layers.find( (l) => {return l.id==row[0]})
    let element = layer.elements.find( (e) => {return e.id==row[1]})
    element.description = row.splice(7,row.length-6).join(',').replaceAll('"','')
  })
}

function listProperties() {
  layers.forEach( (l) => {
    l.elements.forEach( (e) => {
      console.log(e)
    })
  })
}

function getLayers() {return layers}

module.exports = { dumpProperties, clearBuildFolder, buildSetup, createFiles, createMetaData, displayRarity, showAllPossibleClashes, getColors , getLayers, listProperties, readProperties };