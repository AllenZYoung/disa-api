const Declarest = require('../../index.js');

let file = require('path').resolve(__dirname, 'structure.yaml');

new Declarest(file).start();
