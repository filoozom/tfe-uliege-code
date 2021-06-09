const fastify = require("fastify")({ logger: false });
const autoload = require("fastify-autoload");
const path = require("path");

// Register plugins
fastify.register(require("fastify-sensible"));

// Documentation
fastify.register(require("fastify-swagger"), {
  exposeRoute: true,
  routePrefix: "/doc",
  swagger: {
    info: {
      title: "Node - IoT Platform",
      description: "Private for - Node - IoT Platform",
      version: require("../package").version,
    },
    host: "localhost:34500",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
  },
});

// Load all routes
fastify.register(async (instance, opts) => {
  instance.register(autoload, {
    dir: path.join(__dirname, "routes"),
    options: { ...opts },
  });
});

// Create the API instance
const create = async (decorate) => {
  for (const [key, value] of Object.entries(decorate)) {
    fastify.decorate(key, value);
  }

  const listen = async (listen) => {
    const [host, port] = listen.split(":");
    const address = fastify.listen(parseInt(port), host);
    fastify.log.info(`server listening on ${address}`);
  };

  return {
    listen,
    close: fastify.close,
  };
};

module.exports = {
  create,
};
