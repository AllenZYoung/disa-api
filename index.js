const Hapi = require('hapi');
const Log = require('./logger.js');

const mongo = require('./database.js');
const auth = require('./auth.js');
const entries = require('./entries.js');

(function start() {
  mongo.db.then((database) => {
    let server = initServer(Log, mongo.client, database, auth);

    let routes = createRoutes(auth.routes, entries.routes);

    for (let route of routes) {
      server.route(route);
    }

    startServer(server);
  })
  .catch((err) => {
    Log.error('Unable to connect to database. Exiting...');
    process.exit(1);
  });
})();

function initServer(logger, mongo, db, auth) {
  let server = new Hapi.Server();
  server.connection({
    host: "0.0.0.0",
    port: process.env.DISA_PORT,
    routes: {
      cors: true
    }
  });

  server.app.logger = logger;
  server.app.mongo = mongo;
  server.app.db = db;
  server.app.auth = auth;

  return server;
}

function createRoutes(...routeSets) {
  let routes = [];
  for (let routeSet of routeSets) {
    for (let route of routeSet) {
      routes.push(route);
    }
  }
  return routes;
}

function startServer(server) {
  server.start((err) => {
    if (err) {
      Log.error(err);
      process.exit(1);
      return;
    }

    console.log(`Server started on port ${server.info.uri}`);
  });
}
