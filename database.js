const MongoClient = require('mongodb');

let username = process.env.DISA_USERNAME;
let password = process.env.DISA_PASSWORD;
let databaseName = process.env.DISA_DB_LOCATION;
let uri = `mongodb://${username}:${password}@${databaseName}`;

module.exports = (function() {
  return MongoClient.connect(uri);
})();
