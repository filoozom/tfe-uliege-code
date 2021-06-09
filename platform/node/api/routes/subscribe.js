const KEY = "subscriptions:devices";

module.exports = async (fastify) => {
  const { store, syncer } = fastify;

  fastify.get(
    "/",
    {
      schema: {
        description: "Fetch current device subscriptions",
        response: {
          200: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    async () => {
      return fastify.store.get(KEY) || [];
    }
  );

  fastify.post(
    "/",
    {
      schema: {
        description: "Subscribe to a device to keep it in sync",
        response: {
          201: { type: "null" },
        },
        body: {
          type: "object",
          properties: {
            device: { type: "string" },
          },
          required: ["device"],
        },
      },
    },
    async ({ body: { device } }, res) => {
      // Add to the store
      const devices = store.get(KEY) || [];
      store.set(KEY, [...devices, device]);
      await store.save();

      // Subscribe to the device
      syncer.subscribe(device);

      // Send a 201
      res.status(201).send();
    }
  );

  fastify.delete(
    "/:device",
    {
      schema: {
        description: "Unsubscribe from a device to longer be kept it in sync",
        response: {
          204: { type: "null" },
        },
      },
    },
    async ({ params: { device } }, res) => {
      // Remove from the store
      const devices = store.get(KEY) || [];
      store.set(
        KEY,
        devices.filter((id) => id !== device)
      );
      await store.save();

      // Subscribe to the device
      syncer.unsubscribe(device);

      // Send a 201
      res.status(204);
    }
  );
};

module.exports.autoPrefix = "/subscribe";
