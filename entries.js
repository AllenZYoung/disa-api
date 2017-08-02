let routes = [
  {
    method: "GET",
    path: "/entries",
    handler: function(req, resp) {
      return getEntries(req, resp, 'Public', requireAuth = false).bind(server);
    }
  },
  {
    method: "GET",
    path: "/entries/draft",
    handler: function(req, resp) {
      return getEntries(req, resp, 'Draft').bind(server);
    }
  },
  {
    method: "GET",
    path: "/entries/internal",
    handler: function(req, resp) {
      return getEntries(req, resp, 'Internal').bind(server);
    }
  },
  {
    method: "GET",
    path: "/entries/{id}",
    handler: function(req, resp) {
      return getEntry(req, resp, req.params.id).bind(server);
    }
  },
  {
    method: "POST",
    path: "/entries",
    handler: function(req, resp) {
      return createEntry(req, resp).bind(server);
    }
  },
  {
    method: "PUT",
    path: "/entries",
    handler: function(req, resp) {
      return updateEntry(req, resp, req.params.id).bind(server);
    }
  },
  {
    method: "GET",
    path: "/options",
    handler: function(req, resp) {
      return updateEntry(req, resp).bind(server);
    }
  }
]

function getEntries(req, resp, stage, requireAuth = true) {
  let user;
  if (requireAuth) {
    user = this.auth.user(req);

    if (user.error) {
      resp({
        error: user.error.message
      }).code(user.error.code)
      return;
    }
  }

  let collection = this.db.collection('entries');
  let search;
  if (user) {
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
  });
}

function getEntry(req, resp, id) {
  if (!id) {
    resp({
      error: "Error: No ID for the entry specified."
    }).code(400)
    return;
  }

  let collection = this.db.collection('entries');
  let search;
  try {
    search = { _id: MongoClient.ObjectId(id) };
  } catch (e) {
    resp({
      error: "Error: Provided ID is invalid."
    }).code(400)
    return;
  }
  collection.findOne(search)
  .then((result) => {
    let response, code;
    if (result.meta.stage != "Public") {
      let user = this.auth.user(req);
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
    } else {
      response = result;
      code = 200;
    }
    resp(response).code(code);
    return;
  });
}

function createEntry(req, resp) {
  let user = this.auth.user(req);

  if (user.error) {
    resp({
      error: user.error.message
    }).code(user.error.code)
    return;
  }

  this.db.collection('counter').findOneAndUpdate(
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
      body.meta.idSuffix = seq.value.seq;
      body.meta.idPrefix = 10;
      body.meta.creator = user.id;
      body.meta.updatedBy = user.id;

      let collection = this.db.collection('entries');       
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
}

function updateEntry(req, resp, id) {
  let user = this.auth.user(req);

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

  let collection = server.db.collection('entries');
  collection.findOne(
    { _id: MongoClient.ObjectId(id) }
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
      collection.updateOne(
        { _id: MongoClient.ObjectId(id) },
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
}

function getOptions(req, resp) {
  let collection = this.db.collection('options');
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
  let user = this.auth.user(req);

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

  let collection = this.db.collection('options');
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
    resp().code(204);
      return;
    })
  .catch((err) => {
    Log.error(err, req);
    resp({
      error: "Error saving updated options."
    }).code(500);
    return;
  });   
}

module.exports = {
  routes: routes
}
