const MongoClient = require('mongodb');

module.exports = (function autoInit(req, resp, next) {
  MongoClient.connect("mongodb://st:st@ds049624.mlab.com:49624/coledev", function(err, db) {
    if (err) {
      console.error(err);
      throw new Error('Could not connect to the database');
    }
  
    auto(req, resp, next, db);
  });
});

function auto(req, resp, next, connection) {
  connection.collection('counter').findOneAndUpdate({
    _id: "identifier"
  },
  { $inc: {
    seq: 1
  }},
  {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  }, (err, ret) => {
      if (err) {  
        console.log("err", err);
        return;
      }
      console.log("ret", ret);
      req.payload.meta.identifier = ret.value.seq;
      req.payload.meta.category = 10;
      next(req, resp);
  });
}
