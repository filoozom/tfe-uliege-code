// Lib
const { formatProtocol } = require("../../lib/protocols");
const { readStream } = require("../../lib/streams");
const { decodeSignedData } = require("../../lib/data");

const protocol = {
  name: "publish",
  version: "1.0.0",
};

const create = async (node, store, syncer) => {
  node.handle(formatProtocol(protocol), async ({ stream }) => {
    // Close the write stream
    stream.sink([]);

    const reader = await readStream(stream);
    const { value, done } = await reader.next();

    if (done) {
      stream.reset();
      return;
    }

    try {
      const dataPoint = await decodeSignedData(value);
      const devices = store.get("contract:devices") || {};

      // If the device was not registered on the blockchain, abort
      if (!devices[dataPoint.peerId.toB58String()]) {
        await stream.reset();
        return;
      }

      // Publish the data point on PubSub
      syncer.publish(dataPoint);

      // Close both sides
      await stream.close();
    } catch (err) {
      // On failure, reset the stream
      await stream.reset();
      return;
    }
  });

  return {
    stop: () => node.unhandle(formatProtocol(protocol)),
  };
};

module.exports = {
  create,
};
