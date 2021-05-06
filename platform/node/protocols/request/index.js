const PeerId = require("peer-id");
const { nanoid } = require("nanoid");
const { multiaddr } = require("multiaddr");

// Lib
const { formatProtocol } = require("../../lib/protocols");
const { writeStream, readStream } = require("../../lib/streams");

// Proto
const { Request, Reply } = require("./proto");

// Functions
const formatTopic = (device) => `request:device:${device}`;

// Protocols
const REPLY_PROTOCOL = {
  name: "reply",
  version: "1.0.0",
};

const create = async (node, store) => {
  // Replies
  node.handle(formatProtocol(REPLY_PROTOCOL), async ({ stream }) => {
    console.log("Got dialed on reply protocol");

    const reader = await readStream(stream);
    const { value, done } = await reader.next();

    if (done) {
      stream.reset();
      return;
    }

    try {
      const reply = await Reply.decode(value);
      console.log(reply);

      // Close both sides
      await stream.close();
    } catch (err) {
      // On failure, reset the stream
      await stream.reset();
      return;
    }
  });

  // Requests
  const requestHandler = async ({ data, topicIDs }) => {
    console.log("Received request:", Request.decode(data));
    const { id, multiAddresses, query } = Request.decode(data);
    const { device: deviceRaw, from, to } = query;
    const device = PeerId.createFromBytes(deviceRaw).toB58String();
    const validIds = topicIDs.map((id) => id.split(":")[2]);
    const mas = multiAddresses.map(multiaddr);

    // Received an invalid request (wrong topic)
    // TODO: Add location topics (as opposed to device specific ones)
    if (!validIds.includes(device)) {
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
    const replyRaw = Reply.encode(reply).finish();

    // Check multi addresses
    let peerId;
    for (const address of multiAddresses) {
      const parts = address.split("/");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "p2p") {
          // Invalid multi address
          if (!parts[i + 1]) {
            return;
          }

          // Inconsistent peer ID
          if (peerId && parts[i + 1] !== peerId) {
            return;
          }

          peerId = parts[i + 1];
          continue;
        }
      }
    }

    // No peer ID found -> abort
    if (!peerId) {
      return;
    }

    // Add all multi addresses to the peer book
    peerId = PeerId.createFromB58String(peerId);
    node.peerStore.addressBook.add(peerId, mas);

    // Dial the node
    const { stream } = await node.dialProtocol(
      peerId,
      formatProtocol(REPLY_PROTOCOL)
    );

    // Write the reply and end the stream
    const writer = await writeStream(stream);
    writer.write(replyRaw);
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
    console.log("Request:", request);
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
    node.pubsub.on(topic, requestHandler);
    return await node.pubsub.subscribe(topic);
  };

  return {
    subscribe,
    request,
    stop: () => node.unhandle(formatProtocol(REPLY_PROTOCOL)),
  };
};

module.exports = {
  create,
};
