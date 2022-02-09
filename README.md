# ElfiVerse NFTs  

## Installation

```
node index.js

## Layer Organization

const layersOrder = [
    { name: '00_background', number: 1 },
    { name: '01_body', number: 2 },
    { name: '02_clothes', number: 12 },
    { name: '04_mouth', number: 3 },
    { name: '05_eyebrowns', number: 1 },
    { name: '06_eyes', number: 3 },
];
```

The `name` of each layer object represents the name of the folder (in `/layers/`) that the images reside in. The `number` of each layer object represents the total number of image files we are exporting for the custom ELFI. 

For instance, if you have three images in a layer folder and want to pick one of those each time, the `number` should be `3`. If you have a single image in a layer that you want to increase the rarity of to 1 in 100, the `number` for that layer should be `100`. This is what is going to be used for rare asset in our asset map. 

Finally when the parameters are set we can run:

```sh

npm install

npm run build
```
