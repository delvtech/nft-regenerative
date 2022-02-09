const layersOrder = [
    { name: '00_background', number: 1 },
    { name: '01_body', number: 2 },
    { name: '02_clothes', number: 12 },
    { name: '03_hair', number: 12 },
    { name: '04_mouth', number: 3 },
    { name: '05_eyebrowns', number: 1 },
    { name: '06_eyes', number: 1 },
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

const defaultEdition = 1000;

module.exports = { layersOrder, format, rarity, defaultEdition };