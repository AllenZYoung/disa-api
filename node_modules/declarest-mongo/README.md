# DeclaRest-Mongo

* Do you hate writing all the boilerplate for REST APIs for your MongoDB instance?
* Do you wish there was a way to declaratively create a REST API?
* Need a simple way to expose MongoDB to HTTP endpoints?

Look no further! DeclaRest is here!

## Usage

Simply require the file, create a class with structure.yaml file, and start!

```js
const Declarest = require('declarest-mongo');

new Declarest('/path/to/your/structure.yaml').start();
```
That's it! You will now have a REST API running on port 8000.

Note: The above start method is a shortcut for what's actually happening:

```js
new Declarest(file)
.init()
.then((api) => api.start())
.catch((err) => console.error(err));
```
You can use this approach if you need more fine grained control.

### Advanced Usage

If you want to provide some more customization to the underlying server,
this section is for you.

You can pass in an optional `options` argument to the start method.

For example, `new Declarest('structure.yaml').start({ port: 4567 });`.

Available options are:

* port -- Integer. The port the server should run on. Default: 8000.
* host -- String. The host the server should run on. Default: 0.0.0.0.

## structure.yaml

You specify the configuration of the REST API in a structure.yaml file.
(Note: You can actually call it whatever you want, because the file name gets
passed as a function argument.)

You don't get to use whatever syntax you want though. Below is the permissible syntax. For examples, see the `examples/` directory.

```yaml
uri: Required
  routes: Optional (but nothing will happen without it)
    - /desired/path/of/endpoint
      method: Optional (default GET)
      collection: Required
      filter: Optional (default ~, get all documents; only valid with GET)
      projection: Optional (default ~, get all fields; coming soon)
        - fieldName: Boolean        
```

## Contributing

This is very early on in the development process. I'm entirely open to syntax changes (many changes will happen while we are still in version 0.0.x). Feel free to open an issue with a desired syntax change or addition, and we can then discuss it.
