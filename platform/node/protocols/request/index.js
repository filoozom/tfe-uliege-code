const PeerId = require("peer-id");
const { nanoid } = require("nanoid");

// Lib
const { writeStream } = require("../../lib/streams");

// Proto
const { Request, Reply } = require("./proto");

const formatTopic = (device) => `request:device:${device}`;

const create = async (node, store) => {
  const handler = async ({ data, topicIDs }) => {
    const { id, channel, multiAddresses, query } = Request.decode(data);
    const { device: deviceRaw, from, to } = query;
    const device = PeerId.createFromBytes(deviceRaw).toB58String();

    // Received an invalid request (wrong channel)
    // TODO: Add location channels (as opposed to device specific ones)
    if (!topicIDs.includes(device)) {
      return;
    }

    // TODO: Add support for pubsub requests
    if (channel) {
      return;
    }

    const elements = store.get(`device:data:${device}`) || [];

    // Check if we own data in the given period for that device
    // NOTICE: The data array is always sorted from latest to oldest
    // TODO: Make this more efficient with binary search at least
    const result = [];
    for (const element of elements) {
      // The current element happened too long ago
      if (element.date < from) {
        break;
      }

      if (element.date < to) {
        result.push(element);
      }
    }

    // If we don't have any data points, abort
    if (!result.length) {
      return;
    }

    // Create the result object
    const results = Reply.Results.create({
      count: result.length,
      from: result[result.length - 1].date,
      to: result[0].date,
    });
    const reply = Reply.create({ id, results });

    // Dial the node
    const { stream } = await node.dialProtocol(
      multiAddresses,
      formatProtocol({
        name: "reply",
        version: "1.0.0",
      })
    );

    // Write the reply and end the stream
    const writer = await writeStream(stream);
    writer.write(data);
    writer.end();

    // Close both sides
    await stream.close();
  };

  const createRequest = async (id, device, { from, to }) => {
    const query = Request.Query.create({
      device: PeerId.createFromB58String(device).toBytes(),
      from,
      to,
    });
    const request = Request.create({
      id,
      multiAddresses: node.multiaddrs.map(
        (ma) => ma.toString() + "/p2p/" + node.peerId.toB58String()
      ),
      query,
    });
    return Request.encode(request).finish();
  };

  const request = async (device, filter) => {
    // Save the request in the store
    const id = nanoid();
    const requests = store.get("requests");
    store.set("requests", { ...requests, [id]: { device, filter } });
    await store.save();

    // Publish the request
    const request = await createRequest(id, device, filter);
    node.pubsub.publish(formatTopic(device), request);

    return id;
  };

  const subscribe = async (device) => {
    console.log("Subscribing to requests from", device);
    const topic = formatTopic(device);
    node.pubsub.on(topic, handler);
    return await node.pubsub.subscribe(topic);
  };

  return {
    subscribe,
    request,
  };
};

module.exports = {
  create,
};
