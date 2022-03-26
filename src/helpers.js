const { createCanvas, loadImage } = require("canvas");
const jStat = require("jStat");

function newCtx(width,height) {
    var canvas = createCanvas(width, height);
    var ctx = canvas.getContext("2d");
    return ctx;
  }
  
  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

module.exports = { newCtx, numberWithCommas, nthIndex };