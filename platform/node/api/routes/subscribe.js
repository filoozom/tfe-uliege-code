module.exports = async (fastify) => {
  const { store, syncer } = fastify;

  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    async function () {
      return fastify.store.get("devices") || [];
    }
  );

  fastify.post(
    "/",
    {
      body: {
        type: "object",
        properties: {
          device: { type: "string" },
        },
        required: ["device"],
      },
      schema: {
        response: {
          201: { type: "null" },
        },
      },
    },
    async function ({ body: { device } }, res) {
      // Add to the store
      const devices = store.get("devices") || [];
      store.set("devices", [...devices, device]);
      await store.save();

      // Subscribe to the device
      syncer.subscribe(device);

      // Send a 201
      res.status(201).send();
    }
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        response: {
          204: { type: "null" },
        },
      },
    },
    async function ({ params: { device } }, res) {
      // Remove from the store
      const devices = store.get("devices") || [];
      store.set(
        "devices",
        devices.filter((device) => id !== device)
      );
      await store.save();

      // Subscribe to the device
      syncer.unsubscribe(device);

      // Send a 201
      res.status(201).send();
    }
  );
};

module.exports.autoPrefix = "/subscribe";
