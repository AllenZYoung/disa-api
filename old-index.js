const Declarest = require('declarest-mongo');
const MongoClient = require('mongodb');

let sessionCache = {};

new Declarest('structure.yaml').init()
.then((api) => {
  let server = api.createServer({
    "port":80
  }).server;
  server.route({
    method: 'PUT',
    path: '/options',
    handler: function(req, resp) {
      let body = req.payload;
      let username = process.env.DISA_USERNAME;
      let password = process.env.DISA_PASSWORD;
      let uri = `mongodb://${username}:${password}@ds021333.mlab.com:21333/temporary-disa`;
      MongoClient.connect(uri, function(err, db) {
        if (err) {
          console.error(err);
          resp('Could not connect to the database');
          return;
        }
        let collection = db.collection('options');
        collection.replaceOne({_id: null}, body, (err, result) => {
          if (err) {
            console.error(err);
            resp("error");
            return;
          }
          resp("Good");
        });
      });
    }
  });

  const GoogleAuth = require('google-auth-library');
  const auth = new GoogleAuth;
  const CLIENT_ID = "446312611877-5165spcfqes4gostji9i73hf753k090k";
  const client = new auth.OAuth2(CLIENT_ID, process.env.CLIENT_SECRET, '/test');

  server.route({
    method: 'POST',
    path: '/newtoken',
    handler: function(req, resp) {
      console.log("new");
      let body = req.payload;
      let token = body.idtoken;
      client.verifyIdToken(
        token,
        undefined,
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
        function(e, login) {
          if (e) {
            resp("error");
            return;
          }
          var payload = login.getPayload();
          var userid = payload['sub'];
          
          let username = process.env.DISA_USERNAME;
          let password = process.env.DISA_PASSWORD;
          let uri = `mongodb://${username}:${password}@ds021333.mlab.com:21333/temporary-disa`;
          MongoClient.connect(uri, function(err, db) {
            if (err) {
              console.error(err);
              resp('Could not connect to the database');
              return;
            }
            let collection = db.collection('users');
            collection.findOne({email: payload.email}, (err, result) => {
              if (err) {
                console.error(err);
                resp({
                  "status":"Guest",
                  "name":payload.name,
                  "givenName":payload.given_name
                });
                return;
              }
              let s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
              let N = 32;

              // if (!sessionCache[result._id]) {
                sessionCache[result._id] = {
                  "key": Array(N).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join(''),
                  "date": new Date()
                }
                resp({
                  "status": result.role,
                  "name": payload.name,
                  "givenName": payload.given_name,
                  "id": result._id,
                  "session": sessionCache[result._id].key
                });
                return;
              // } else {
              //   resp({
              //     "status": result.role,
              //     "name": payload.name,
              //     "givenName": payload.given_name,
              //     "id": result._id,
              //     "session": sessionCache[result._id].key
              //   });
              // }
              // return;

              if (sessionCache[result._id]) {
                // outdated
                if (sessionCache[result._id].date < new Date() - 1000 * 60 * 60) {
                  sessionCache[result._id] = {
                    "key": Array(N).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join(''),
                    "date": new Date()
                  }
                  resp({
                    "status": result.role,
                    "name": payload.name,
                    "givenName": payload.given_name,
                    "id": result._id,
                    "session": sessionCache[result._id].key
                  });
                }
              } else {
                sessionCache[result._id] = {
                  "key": Array(N).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join(''),
                  "date": new Date()
                }
                resp({
                  "status": result.role,
                  "name": payload.name,
                  "givenName": payload.given_name,
                  "id": result._id,
                  "session": sessionCache[result._id].key
                });
              }
              
            });
          });
        }
      );
    }
  });

  server.route({
    method: 'GET',
    path: '/entries/draft',
    handler: function(req, resp) {
      let body = req.query;
      let session = body.session;
      let id = body.id;
      // new token hasn't finished
      if (!session) {
        resp({
          "error": "not signed in"
        });
        return;
      }
      if (!sessionCache[id]) {
        console.log("refresh needed");
        resp({
          "refresh": true
        });
        return;
      }
      if (session != sessionCache[id].key) {
        console.log("forgery");
        resp({
          "error": "not authorized"
        });
        return;
      }
          
      let username = process.env.DISA_USERNAME;
      let password = process.env.DISA_PASSWORD;
      let uri = `mongodb://${username}:${password}@ds021333.mlab.com:21333/temporary-disa`;
      MongoClient.connect(uri, function(err, db) {
        if (err) {
          console.error(err);
          resp('Could not connect to the database');
          return;
        }
        console.log(id);
        let collection = db.collection('new_entries');
        collection.find({'meta.creator': id})
        .toArray((err, results) => {
          if (err) {
            console.error(err);
            resp("error");
            return;
          }
          console.log(results);
          resp(results);
        });
      });
    }
  });

  api.start().catch((e) => console.log(e));
})
.catch((e) => console.log(e));

