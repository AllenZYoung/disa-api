const GoogleAuth = require('google-auth-library');
const auth = new GoogleAuth;
const CLIENT_ID = "446312611877-5165spcfqes4gostji9i73hf753k090k.apps.googleusercontent.com";
const client = new auth.OAuth2(CLIENT_ID, process.env.CLIENT_SECRET, '/');

function getTokenFromHeader(header) {
  let headerPrefix = "Bearer ";
  let startIndex = header.indexOf(headerPrefix);
  if (startIndex == -1) {
    return null;
  }
  let token = header.substr(headerPrefix.length);
  return token;
}

function verifyToken(token, callback) {
  return client.verifyIdToken(
    token,
    CLIENT_ID,
    function(err, login) {
      return callback(err, login);
    }
  );
}

function verifyCallback(err, login) {
  if (err) {
    Log.error(err);
    return {
      error: {
        message: "Invalid credentials.",
        code: 401
      }
    }
  } else {
    let payload = login.getPayload();
    let userId = payload['sub'];
    let payloadEmail = payload.email.toString().toLowerCase().trim();
    return {
      data: [userId, payloadEmail, payload]
    };    
  }
}

function user(req) {
  let user = {};
  let token = getTokenFromHeader(req.headers.authorization);
  if (!token) {
    user.error = {
      message: "No credentials found. Please try again after signing out and signing back in.",
      code: 401
    }
  } else {
    let tokenResult = verifyToken(token, verifyCallback);
    if (tokenResult.error) {
      user.error = tokenResult.error
    } else {
      let [ userId, email, payload ] = tokenResult.data;

      let collection = this.db.collection('users');
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
        }
      );
    }
  }

  return user;
}

let routes = [
  {
    method: "POST",
    path: "/signin",
    handler: function(req, resp) {
      let user = user(req);
      if (user.error) {
        reply({
          user: user.error
        }).code(user.error.code);
        return;
      } else {
        reply({
          user: user
        }).code(200);
      }
    }
  }
]

module.exports = {
  routes: routes,
  user: user
}
