const Log = require('./logger.js');

let routes = [
  {
    method: "GET",
    path: "/entries",
    handler: function(req, resp) {
      return getEntries(req, resp, 'Public', requireAuth = false);
    }
  },
  {
    method: "GET",
    path: "/entries/draft",
    handler: function(req, resp) {
      return getEntries(req, resp, 'Draft');
    }
  },
  {
    method: "GET",
    path: "/entries/internal",
    handler: function(req, resp) {
      return getEntries(req, resp, 'Internal');
    }
  },
  {
    method: "GET",
    path: "/entries/{id}",
    handler: function(req, resp) {
      return getEntry(req, resp, req.params.id);
    }
  },
  {
    method: "POST",
    path: "/entries",
    handler: function(req, resp) {
      return createEntry(req, resp);
    }
  },
  {
    method: "PUT",
    path: "/entries/{id}",
    handler: function(req, resp) {
      return updateEntry(req, resp, req.params.id);
    }
  },
  {
    method: "GET",
    path: "/options",
    handler: function(req, resp) {
      return getOptions(req, resp);
    }
  },
  {
    method: "PUT",
    path: "/options/{name}",
    handler: function(req, resp) {
      return updateOptions(req, resp, req.params.name);
    }
  }
]

function __getEntries(req, resp, stage, user) {
  let collection = req.server.app.db.collection('entries');
  let search;
  if (user && stage === "Draft") {
    search = {$and: [
      {'meta.stage': stage},
      {'meta.creator': user.id}
    ]}
  } else {
    search = {'meta.stage': stage}
  }
  collection.find(search)
  .toArray((err, results) => {
    if (err || !results) {
      Log.error(err, req);
      resp({
        error: `Error getting ${stage.toLowerCase()} entries.`
      }).code(500);
      return;
    }
    resp(results);
    return;
  });
}

function getEntries(req, resp, stage, requireAuth = true) {
  if (requireAuth) {
    req.server.app.auth.user(req, function(user) {
      if (user.error) {
        resp({
          error: user.error.message
        }).code(user.error.code)
        return;
      }
      __getEntries(req, resp, stage, user);
      return;
    });
    return;
  } else {
    __getEntries(req, resp, stage);
    return;
  }
}

function getEntry(req, resp, id) {
  if (!id) {
    resp({
      error: "Error: No ID for the entry specified."
    }).code(400)
    return;
  }

  let collection = req.server.app.db.collection('entries');
  let search;
  try {
    search = { _id: req.server.app.mongo.ObjectId(id) };
  } catch (e) {
    Log.error(e);
    resp({
      error: "Error: Provided ID is invalid."
    }).code(400)
    return;
  }
  collection.findOne(search)
  .then((result) => {
    if (!result) {
      resp({
        error: "Requested person not found in database."
      }).code(404);
      return;
    }
    let response, code;
    if (result.meta.stage != "Public") {
      req.server.app.auth.user(req, function(user) {
        if (user.error) {
          response = {
            error: "You must sign in to access a non-public entry."
          }
          code = 401;
        } else {
          if ("" + result.meta.creator !== user.id) {
            response = {
              error: "You do not have access to someone else's drafts."
            }
            code = 403;
          } else {
            response = result;
            code = 200;
          }
        }
        resp(response).code(code);
        return;
      });
      return;
    } else {
      response = result;
      code = 200;
      resp(response).code(code);
      return;
    }
  });
}

function createEntry(req, resp) {
  return req.server.app.auth.user(req, function(user) {
    if (user.error) {
      resp({
        error: user.error.message
      }).code(user.error.code)
      return;
    }

    req.server.app.db.collection('counter').findOneAndUpdate(
      { _id: "identifier" },
      { $inc: { seq: 1 } },
      { 
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      },
      (err, seq) => {
        if (err || !seq) {  
          Log.error(err, req);
          resp({
            error: "Error in generating a DISA ID."
          }).code(500);
          return;
        }

        let body = req.payload;
        if (!body.meta) {
          body.meta = {
            stage: "Draft"
          };
        }
        body.meta.idSuffix = seq.value.seq;
        body.meta.idPrefix = 10;
        body.meta.creator = user.id;
        body.meta.updatedBy = user.id;

        let collection = req.server.app.db.collection('entries');       
        collection.insertOne(body)
        .then((result) => {
          resp({
            status: 201
          }).code(201);
        })
        .catch((err) => {
          Log.error(err, req);
          resp({
            error: true
          }).code(500);
          return;
        });
      }
    );
  });  
}

function updateEntry(req, resp, id) {
  return req.server.app.auth.user(req, function(user) {
    if (user.error) {
      resp({
        error: user.error.message
      }).code(user.error.code)
      return;
    }

    if (!id) {
      resp({
        error: "Error: No ID for the entry specified."
      }).code(400)
      return;
    }

    let collection = req.server.app.db.collection('entries');
    try {
      id = req.server.app.mongo.ObjectId(id);
    } catch (e) {
      Log.error(e, req);
      resp({
        error: "Invalid ID"
      }).code(400);
      return;
    }
    collection.findOne(
      { _id: id }
    )
    .then((result) => {
      if (!result) {
        resp({
          error: "Error: Unable to locate requested person."
        }).code(400)
        return;
      }
      if (result.meta.stage === 'Draft' && result.meta.creator != user.id) {
          resp({
            error: "You do not have permission to change this entry."
          }).code(403);
          return;
      } else {
        let body = req.payload;
        body.meta.creator = result.meta.creator;
        body.meta.updatedBy = user.id;
        delete body._id;
        try {
          id = req.server.app.mongo.ObjectId(id);
        } catch (e) {
          Log.error(e, req);
          resp({
            error: "Invalid ID"
          }).code(400);
          return;
        }
        collection.updateOne(
          { _id: id },
          { $set: body }
        )
        .then((result) => {
          resp({
            status: 200
          }).code(200);
          return;
        })
        .catch((err) => {
          Log.error(err, req);
          resp({
            error: "Error saving the new entry. This should never happen. If it does, please inform Cole ASAP and stop entering data!"
          }).code(500);
          return;
        });
      }
    });
  });
}

function getOptions(req, resp) {
  let collection = req.server.app.db.collection('options');
  collection.find({}, {_id: false})
  .toArray((err, results) => {
    if (err || !results) {
      Log.error(err, req);
      resp({
        error: "Error getting options from database or no options present."
      }).code(500);
      return;
    }
    resp(results).code(200);
    return;
  });
}

function updateOptions(req, resp, option) {
  req.server.app.auth.user(req, function(user) {
    if (user.error) {
      resp({
        error: user.error.message
      }).code(user.error.code)
      return;
    }

    if (!option) {
      resp({
        error: "Error: No option specified."
      }).code(400)
      return;
    }

    let collection = req.server.app.db.collection('options');
    let body = req.payload;
    body = {
      [option]: Array.from(body)
    };
    collection.updateOne(
      { _id: option },
      { $set: body },
      { upsert: true }
    )
    .then((result) => {
      resp({
        options: body[option],
        optionsName: option
      }).code(200);
      return;
    })
    .catch((err) => {
      Log.error(err, req);
      resp({
        error: "Error saving updated options."
      }).code(500);
      return;
    });
  });
}

module.exports = {
  routes: routes
}
