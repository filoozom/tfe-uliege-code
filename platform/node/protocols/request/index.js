const PeerId = require("peer-id");
const { nanoid } = require("nanoid");
const { multiaddr } = require("multiaddr");

// Lib
const { formatProtocol } = require("../../lib/protocols");
const { writeStream, readStream } = require("../../lib/streams");
const { timeoutPromise } = require("../../lib/tools");
const { decodeSignedData } = require("../../lib/data");

// Proto
const {
  Request,
  Reply,
  ReplyData,
  ReplyConfirm,
  SignedData,
} = require("./proto");

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

    try {
      const reader = await readStream(stream);
      const { value: replyRaw } = await reader.next();
      const { id, results } = await Reply.decode(replyRaw);
      console.log({ id, results });

      // If the reply contains no results, reset the
      //  connection, as it should never happen.
      if (!results.count) {
        await stream.reset();
        return;
      }

      // Simply accept all incoming requests for now
      // TODO: More advanced protocol if necessary
      const writer = await writeStream(stream);
      const confirm = ReplyConfirm.create({ id });
      const confirmRaw = ReplyConfirm.encode(confirm).finish();
      writer.write(confirmRaw);

      // Now read the results
      const { value: replyDataRaw } = await reader.next();
      const replyData = await ReplyData.decode(replyDataRaw);

      // Decode all SignedData. This is done in two steps so that
      // the first one can throw for each data point before writing
      // them to the database.
      const decoded = await Promise.all(
        replyData.results.map(decodeSignedData)
      );
      await Promise.all(decoded.map(store.dataPoint.write));

      // Close both sides
      await writer.end();
      await stream.close();
    } catch (err) {
      console.log(err);

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
      console.error(
        `Invalid topic ID (got ${device}, expected ${validIds.join(" or ")}`
      );
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
      console.error(
        `No data available for device ${device} from ${from} to ${to}`
      );
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
      let found;

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "p2p") {
          // Invalid multi address
          if (!parts[i + 1]) {
            return;
          }

          // Make sure we find the last PeerId because there
          // can be multiple ones because of circuit relays
          found = parts[i + 1];
        }
      }

      if (!peerId) {
        peerId = found;
      }

      // Inconsistent peer ID
      else if (found !== peerId) {
        console.error(`Inconsistent PeerIds found: ${peerId} and ${found}`);
        return;
      }
    }

    // No peer ID found -> abort
    if (!peerId) {
      console.error("No PeerId found...");
      return;
    }

    console.log(`Adding PeerIds for ${peerId}:\n-`, mas.join("\n- "));

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

    // Wait for a ReplyConfirm message
    const reader = await readStream(stream);
    const timeoutError = { code: "PROMISE_TIMEOUT" };

    try {
      const { value: replyConfirmRaw } = await timeoutPromise(
        reader.next(),
        5 * 1000,
        timeoutError
      );
      const replyConfirm = ReplyConfirm.decode(replyConfirmRaw);

      if (replyConfirm.id !== id) {
        console.error(`Inconsistent IDs found: ${replyConfirm.id} and ${id}`);
        await writer.end();
        await stream.close();
        return;
      }
    } catch (err) {
      if (err === timeoutError) {
        // Reset the stream
        await stream.reset();
        return;
      }

      throw err;
    }

    const replyData = ReplyData.create({
      id,
      results: result.map(({ raw }) => SignedData.decode(Buffer.from(raw))),
    });
    const replyDataRaw = ReplyData.encode(replyData).finish();

    console.log(replyData);

    // Send the ReplyData
    writer.write(replyDataRaw);
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
