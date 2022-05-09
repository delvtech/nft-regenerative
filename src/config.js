const layersOrder = [
    { fileName: '00_background', number: 1, allowNone: false },
    { fileName: '01_weapon', number: 2, allowNone: 80 },
    { fileName: '02_body', number: 12, allowNone: false },    // everyone has bodies
    { fileName: '03_clothing', number: 12, allowNone: 2 },
    { fileName: '04_hair', number: 3, allowNone: 25 },
    { fileName: '05_mouth', number: 1, allowNone: 2 },
    { fileName: '06_eyebrows', number: 1, allowNone: false },
    { fileName: '07_eyes', number: 1, allowNone: 1 },       // everyone has eyes
    { fileName: '08_hat', number: 3, allowNone: 70 },
    { fileName: '09_eyewear', number: 2, allowNone: 76 },
    { fileName: '10_addon', number: 1, allowNone: 88 },
 
];
  
const format = {
    width: 400,
    height: 400
};

const rarity = [
    // { key: "", val: "original" },
    // { key: "_r", val: "rare" },
    // { key: "_sr", val: "super rare" },
];

// independent rarities
// matrix of properties (7) * assets in each property (10) = 70 rows by 1 column

// joint rarities
// 2d matrix of properties (7) by assets in each property (10) = 7 rows by 10 columns

const defaultEdition = 2500;

module.exports = { layersOrder, format, rarity, defaultEdition };