const fs = require("fs");
const hashFunction = require('object-hash');
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
let layers = [];
let numLayers = 0;
let numClashes = 0;
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
        layer_id: -1,
        id: allowNone ? index + 1 : index, // from 0 to n instead of 1 to n+1 for simpler indexing
        name: cleanedName,
        fileName: i,
        color: cleanedName.substring(nthIndex(cleanedName,'_',99)+1).toLowerCase(),
        rarity: parseInt(rarity),
        adjustedRarity: parseInt(rarity)
      };
    });
    if (allowNone) {
      elements.unshift({
        layer_id: -1,
        id: 0,
        name: 'none',
        fileName: 'none',
        color: 'none',
        rarity: allowNone,
        adjustedRarity: allowNone
      })
    }
  return elements
}

function layersSetup(layersOrder,debug) {
  layers = layersOrder.map((layerObj, index) => ({
    layer_id: index,
    fileName: layerObj.fileName,
    name: layerObj.fileName.charAt(3).toUpperCase() + layerObj.fileName.slice(4),
    location: `${layersDir}/${layerObj.fileName}/`,
    elements: getElements(`${layersDir}/${layerObj.fileName}/`,layerObj.allowNone),
    position: { x: 0, y: 0 },
    size: { width: format.width, height: format.height },
    number: layerObj.number // their order from the back, 1 = backest
  }));

  readProperties()

  var combinations = 0;
  numLayers = 0;
  layers.forEach((layer,index) => {
    console.log('adjusting rarity for layer ' + index)
    noneRarity = layer.elements.map(e => e.name=='none' ? e.rarity : 0).reduce((s,a) => s+parseInt(a),0); // include only 'none element
    actualRarity = layer.elements.map(e => e.name=='none' ? 0 : e.rarity).reduce((s,a) => s+parseInt(a), 0) // excluding 'none' element
    layer.elements.forEach(e => {
      e.name == 'none' ? e.adjustedRarity = parseInt(e.rarity) : e.adjustedRarity = e.rarity * (100 - noneRarity) / actualRarity
      e.layer_id = index
    })
    if (debug) {
      console.log(layer.elements.map(e => e.adjustedRarity))
      console.log(layer.elements.map(e => e.adjustedRarity).reduce((s,a) => s + a,0))
    }
    layer.numElements = layer.elements.length;
    rarityCount.push(Array(layer.numElements).fill(0));
    (combinations == 0) ? combinations = layer.numElements : combinations = combinations * layer.numElements
    numLayers = numLayers + 1;
  });

  console.log('read in ' + layers.length + ' layers with ' + numberWithCommas(layers.map(l=>l.numElements).reduce((p,c)=>p*c,1)) + ' unique combinations from ' + numberWithCommas(layers.map(l=>l.numElements).reduce((s,a)=>s+a)) + ' assets');
  // console.log(layers)

  return layers;
}

function clearBuildFolder() {
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
    try { fs.mkdirSync(buildDir); } catch {}
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
  // calculate class based on rarities
  let elfClass = 'Adventurer'
  if (['Bow','Dual'].some(el => layers[1].elements[rarities[1]].name.includes(el))) elfClass = 'Ranger'
  else if (['word'].some(el => layers[1].elements[rarities[1]].name.includes(el))) elfClass = 'Warrior'
  else if (['Golden Lance', 'Ice Lance', 'Golden Staff', 'Jade Staff'].some(el => layers[1].elements[rarities[1]].name.includes(el))) elfClass = 'Cleric'
  else if (['Robe'].some(el => layers[3].elements[rarities[3]].name.includes(el))) elfClass = 'Cleric'
  else if (['Draconic Lance', 'Draconic Staff'].some(el => layers[1].elements[rarities[1]].name.includes(el))) elfClass = 'Mage'
  if (['Mage'].some(el => layers[8].elements[rarities[8]].name.includes(el))) elfClass = 'Mage'
  let tempMetadata = {
    name: `Elf #${_edition}`,
    class: elfClass,
    attributes: attributes,
    hash: hashFunction(rarities),
    elements: '[' + rarities.join(",") + ']',
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
}

function addAttributes(elements) {
  for (const _element of elements) {
    let tempAttr = {
      trait_type: layers[_element.layer_id].name  // opensea standard
      ,value: _element.name     // opensea standard
      // ,rarity: _element.rarity
      ,description: _element.description
    };
  attributes.push(tempAttr);
  if (debug) console.log(_element)
  rarityCount[_element.layer_id][_element.id] += 1; // this should be done only after checking for dupes.. same with this whole function?
  };
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

async function calcRarity(layers,debug,currentID) {
  // pick an asset
  elements = [];
  colors = [];
  await layers.forEach(async (layer,layerIdx) => {
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

      // hand-pick element
      // if (layerIdx == 8) chosenElement = 7

      tempElement = layer.elements[chosenElement];
      if (debug) console.log(`${cumsum} vs. ${randNum*100} gives ${layer.name}:${tempElement.name}`)
      tempColor = tempElement.color;
      if (debug) console.log(tempColor)
      if (debug) console.log(colors)
      lkupColor = colors.indexOf(tempColor);
      if ((lkupColor > 1) & (tempColor!='none')) { // ignore matches to background and weapons
        // we have a color clash!
        numClashes++
        console.log('**COLOR CLASH** at ID=' + currentID + ' between [' + layers[lkupColor].name + ':' + layers[lkupColor].elements[elements[lkupColor]].name + '] and [' + layer.name + ':' + tempElement.name + '] redrawing...')
      }
      // else { // 
        elements.push(chosenElement); // from 0 to n instead of from 1 to n+1 to allow simpler indexing
        colors.push(tempColor);
        colorClash = false;
      // } // end if clash
    } // end while colorclash
  }); // end forEach

  // tweak results
  checkLayer   = layers.map(l => l.name).indexOf('Hat')
  replaceLayer = layers.map(l => l.name).indexOf('Hair')
  if (elements[checkLayer]!=0) { // if wearing a hat
    if (debug) {
      hat = layers[checkLayer].elements[elements[checkLayer]].name
      firstHair = layers[replaceLayer].elements[elements[replaceLayer]].name
    }
    // reroll hair to fit under a hat: remove bun, long hair, mohawk, ponytail
    while (layers[replaceLayer].elements[elements[replaceLayer]].name.match('(Bun|Long|Mohawk|Pony)')!=null) {
      randNum = Math.random()
      cumsum=0
      i = 0
      while (cumsum < randNum*100) {
        cumsum = cumsum + layers[replaceLayer].elements[i].adjustedRarity
        chosenElement=i
        i++
      }
      if (debug) console.log(`changing ${layers[replaceLayer].name} for #${currentID} from ${layers[replaceLayer].elements[elements[replaceLayer]].name} to ${layers[replaceLayer].elements[chosenElement].name}`)
      elements[replaceLayer] = chosenElement;
    }
    if (debug) {
      secondHair = layers[replaceLayer].elements[elements[replaceLayer]].name
      if (secondHair!=firstHair) { console.log(`elf has ${hat}: changed hair from ${firstHair} to ${secondHair}`) }
      else { console.log(`elf has ${hat}: kept ${firstHair}`) }
    }
  }

  return elements;
}

async function createFiles(edition, to_draw, provide_rarity=false, name, debug) {
  let numDupes = 0, tempElements = []
  var startTime = performance.now();

  for (let i = 1; i <= edition; i++) {
    tempElements = []
    // create rarity
    rarities = provide_rarity ? rarity : await calcRarity(layers,debug,i);
    if (debug) console.log(rarities)
    layers.forEach(async (layer, layerIdx) => {
      let element = layer.elements[rarities[layerIdx]] ? layer.elements[rarities[layerIdx]] : null;
      tempElements.push(element)
    });

    // check for duplicate and add to hash. if duplicate, decrement i and break
    let key = rarities.toString();
    if (Exists.has(key)) { // we find a duplicate
      console.log(`Duplicate creation for edition ${i}. Same as edition ${Exists.get(key)}`);
      numDupes++;
      if (numDupes > edition) break; //prevents infinite loop if no more unique items can be created
      i--;
    } else { // it's unique
      Exists.set(key, i);
      addAttributes(tempElements);
      addMetadata(i); // pushes "attributes" into "metadata"
      rarities.push(rarities);
      if (i % 100 == 0) console.log("Created edition " + i + ' at ' + numberWithCommas(Math.round(i / (performance.now() - startTime) * 1000 * 60)) + ' Elfis/minute');
    }

    // export its metadata
    fs.writeFileSync(`${buildDir}\\${i}.json`, JSON.stringify(metadata[i-1], null, 2));

    // draw the damn thing
    ctx = newCtx(format.width,format.height)
    if (rarities[9] == 3) layerDrawOrder = [0,1,2,3,4,5,6,7,9,8,10]
    else layerDrawOrder = [0,1,2,3,4,5,6,7,8,9,10]
    for (const layerIdx of layerDrawOrder) {
      let layer = layers[layerIdx]
      let element = layer.elements[rarities[layerIdx]] ? layer.elements[rarities[layerIdx]] : null;
      if ((to_draw) & (element.fileName!='none')) {
        r = await drawLayer(ctx, layer, i, element, name)
      }
    };
    
  } // end for i<=edition loop

  console.log('Created ' + edition + ' editions in ' + (performance.now() - startTime) / 1000 + ' seconds\n   numDupes=' + numDupes);
  console.log('  number of color clashes: ' + numClashes);
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
      numRarity = rarityCount[layer.layer_id][element.id];
      if (layerIdx==0) totalNum += numRarity;
      z = (numRarity / metadata.length - element.adjustedRarity/100)/Math.sqrt((element.adjustedRarity/100)*(1-element.adjustedRarity/100)/metadata.length)
      pvalue = 1 - jStat.normal.cdf(Math.abs(z),0,1);
      res = pvalue < 0.05 ? ' *REJECT' : '';
      console.log(`${element.name} actual: ${numRarity}/${metadata.length}=${numRarity / metadata.length * 100}%, raw: ${element.rarity}, adjusted: ${element.adjustedRarity}, pvalue: ${pvalue}${res}`);
    });
  });
  console.log(`total elements counted: ${totalNum}`)
  console.log('== displaying classes ==');
  classNames = ['Ranger','Warrior','Cleric','Mage','Adventurer']
  numClasses = Array(5).fill(0);
  for (const item of metadata) numClasses[classNames.indexOf(item.class)]++;
  for (const item of classNames) console.log(`  Number of ${item}: ${numClasses[classNames.indexOf(item)]} (${Math.round(numClasses[classNames.indexOf(item)]/metadata.length*100)}%)`);
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
              rarities = Array(numLayers).fill(0)
              rarities[layerIdx1]=lkupColor
              rarities[layerIdx2]=elementIdx
              fileName = '' + layer1.fileName + '_' + layer1.elements[lkupColor].name + '-' + layer2.fileName + '_' + element.name + ''
              // console.log(fileName)
              r = await createFiles(1, to_draw=true, rarities = rarities, fileName);
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
    res[l.layer_id]=m
  })
  return res
}

function dumpProperties() {
  var names = {}
  layers.map( (l) => {
    let newRow = l.elements.map( e => {
      res = []
      res.push(...Object.values(e))
      return res
    })
    names[l.name]=newRow[0]
    rows.push(...newRow)
  })
  let csvContent = Object.keys(layers[0].elements[0]).join(',')+'\n'
  csvContent += rows.map(e => {
    return '"'+e.join('","').replaceAll('\r','')+'"\n'
  })
  csvContent = csvContent.replaceAll('\n,','\n')
  // console.log(csvContent)
  fs.writeFileSync('assets_output.csv',csvContent)
  return {names,rows}
}

function renameFiles() {
  layers.forEach( l => {
    l.elements.forEach( e => {
      if (e.fileName!='none') {
        let newName = e.name.replaceAll(' ','_').replaceAll('/','_').replaceAll('\\','_').replaceAll('-','_').replaceAll('.','_')
        fs.renameSync(`${process.env.PWD}\\layers\\${l.fileName}\\${e.fileName}`,`${process.env.PWD}\\layers\\${l.fileName}\\${newName}.png`)
        e.fileName = newName
      }
    })
  })
}

function readProperties() {
  var l = fs.readFileSync('assets_input.csv').toString().split('\n')
  l=l.splice(1,l.length-2)
  l.forEach( (e,i) => {
    let row = e.split(',')
    let layer = layers.find( (l) => {return l.layer_id==row[0]})
    let element = layer.elements.find( (e) => {return e.id==row[1]})
    element.description = row.splice(7,row.length-6).join(',').replaceAll('"','').replaceAll('\r','')
    element.rarity = row[5]
    element.name = row[2]
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

module.exports = { dumpProperties, clearBuildFolder, buildSetup, createFiles, createMetaData, displayRarity, showAllPossibleClashes, getColors , getLayers, listProperties, readProperties, renameFiles };