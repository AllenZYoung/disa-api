const GoogleAuth = require('google-auth-library');
const auth = new GoogleAuth;
const CLIENT_ID = "446312611877-5165spcfqes4gostji9i73hf753k090k.apps.googleusercontent.com";
const client = new auth.OAuth2(CLIENT_ID, process.env.CLIENT_SECRET, '/');
const Log = require('./logger.js');

function getTokenFromHeader(header) {
  if (!header) {
    return null;
  }
  let headerPrefix = "Bearer ";
  let startIndex = header.indexOf(headerPrefix);
  if (startIndex == -1) {
    return null;
  }
  let token = header.substr(headerPrefix.length);
  return token;
}

function verifyToken(token, verifyCallback, callback) {
  client.verifyIdToken(
    token,
    CLIENT_ID,
    function(err, login) {
      return verifyCallback(err, login, callback);
    }
  );
}

function verifyCallback(err, login, callback) {
  if (err) {
    Log.error(err);
    callback({
      error: {
        message: "Invalid credentials.",
        code: 401
      }
    });
    return;
  } else {
    let payload = login.getPayload();
    let userId = payload['sub'];
    let payloadEmail = payload.email.toString().toLowerCase().trim();
    callback({
      data: [userId, payloadEmail, payload]
    });
    return;    
  }
}

function user(req, callback) {
  let user = {};
  let token = (req.headers && getTokenFromHeader(req.headers.authorization)) || (req.payload && req.payload.idtoken);
  if (!token) {
    user.error = {
      message: "No credentials found. Please try again after signing out and signing back in.",
      code: 401
    }
    callback(user);
    return;
  } else {
    verifyToken(token, verifyCallback, function(tokenResult) {
      if (tokenResult.error) {
        user.error = tokenResult.error;
        callback(user);
        return;
      } else {
        let [ userId, email, payload ] = tokenResult.data;

        let collection = req.server.app.db.collection('users');
        collection.findOne(
          { email: email },
          (err, result) => {
            let response;
            if (err || !result) {
              Log.error(err, req);
              user = {
                id: userId,
                role: "Guest",
                name: payload.name,
                givenName: payload.given_name,
                payload: payload
              }
            } else {
              user = {
                id: userId,
                role: result.role,
                name: payload.name,
                givenName: payload.given_name,
                payload: payload
              }
            }
            callback(user);
            return;
          }
        );
      }
    });
  }
}

let routes = [
  {
    method: "POST",
    path: "/signin",
    handler: function(req, resp) {
      user(req, function(user) {
        if (user.error) {
          resp(user).code(400);
          return;
        } else {
          resp(user).code(200);
          return;
        }
      });
    }
  }
]

module.exports = {
  routes: routes,
  user: user
}
