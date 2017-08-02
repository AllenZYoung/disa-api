const Declarest = require('../../index.js');

let file = require('path').resolve(__dirname, 'structure.yaml');

new Declarest(file).start(); // shorthand for new Declarest(file).init().then((api) => api.start()).catch((err) => console.error(err));

// alternatively:
// const api = new Declarest(file);
// (async function() {
//   await api.init();
//   await api.start();
// })();

