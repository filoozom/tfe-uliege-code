const fastify = require("fastify")();
const autoload = require("fastify-autoload");
const path = require("path");

fastify.register(async (instance, opts) => {
  instance.register(autoload, {
    dir: path.join(__dirname, "routes"),
    options: { ...opts },
  });
});

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
