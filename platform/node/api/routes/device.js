module.exports = async (fastify) => {
  const { store, requester } = fastify;

  // Schemas
  const deviceSchema = {
    type: "object",
    properties: {
      id: { type: "string" },
      coordinates: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
        },
      },
    },
  };

  const dataSchema = {
    type: "object",
    properties: {
      temperature: { type: "number" },
      humidity: { type: "number" },
    },
  };

  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: deviceSchema,
          },
        },
      },
    },
    () => Object.values(store.get("contract:devices"))
  );

  fastify.get(
    "/:id",
    {
      schema: {
        response: {
          200: deviceSchema,
        },
      },
    },
    ({ params: { id } }, res) => {
      const device = store.get("contract:devices")[id];
      if (!device) {
        res.notFound();
        return;
      }
      return device;
    }
  );

  fastify.get(
    "/:id/last",
    {
      schema: {
        response: {
          200: dataSchema,
        },
      },
    },
    ({ params: { id } }) => {
      const device = store.get("contract:devices")[id];
      if (!device) {
        res.notFound("device not found");
        return;
      }

      const data = store.get(`device:data:${id}`) || [];
      if (!data.length) {
        res.notFound("no data for this device");
        return;
      }
      return data[0].data;
    }
  );

  fastify.get(
    "/:id/data",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: dataSchema,
          },
        },
      },
    },
    ({ params: { id } }) => {
      const device = store.get("contract:devices")[id];
      if (!device) {
        res.notFound();
        return;
      }

      return (store.get(`device:data:${id}`) || []).map(({ data }) => data);
    }
  );

  fastify.post(
    "/:id/request",
    {
      schema: {
        body: {
          from: { type: "integer" },
          to: { type: "integer" },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
          },
        },
      },
    },
    async ({ params: { id: device }, body }, res) => {
      const id = await requester.request(device, body);
      res.status(201);
      return { id };
    }
  );
};

module.exports.autoPrefix = "/device";
