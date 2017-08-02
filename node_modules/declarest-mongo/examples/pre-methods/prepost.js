module.exports = (function(req, resp, next) {
  req.payload.newField = "You are able to add fields to the request payload";
  console.log("You can also log information");
  // you could also do authentication, or pretty much anything else

  // just call next when you are done
  next(req, resp);
  return;

  // alternatively, you could call resp and skip the provided post handler
  // giving complete control over the route.
  // You can do this to override a default route if you so need
  // resp("Skipping things");
});
