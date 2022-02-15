const layersOrder = [
    { name: '00_background', number: 1 },
    { name: '01_weapons', number: 2 },
    { name: '02_bodies', number: 12 },
    { name: '03_clothes', number: 12 },
    { name: '04_hair', number: 3 },
    { name: '05_mouth', number: 1 },
    { name: '06_eyebrows', number: 1 },
    { name: '07_eyes', number: 1 },
    { name: '08_hats', number: 3 },
    { name: '09_eyewear', number: 2 },
    { name: '10_addons', number: 1 },
 
];
  
const format = {
    width: 800,
    height: 800
};

const rarity = [
    { key: "", val: "original" },
    { key: "_r", val: "rare" },
    { key: "_sr", val: "super rare" },
];

// independent rarities
// matrix of properties (7) * assets in each property (10) = 70 rows by 1 column

// joint rarities
// 2d matrix of properties (7) by assets in each property (10) = 7 rows by 10 columns

const defaultEdition = 2500;

module.exports = { layersOrder, format, rarity, defaultEdition };