module.exports = class Log {
  constructor(){}

  static error(err, req) {
    console.error("===================START=====================");
    console.error(new Date().toLocaleString());
    req && console.error(req);
    console.error(err);
    console.error("====================END======================");
  }
}
