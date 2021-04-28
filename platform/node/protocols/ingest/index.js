// Lib
const { formatProtocol } = require("../../lib/protocols");
const { readStream } = require("../../lib/streams");
const { decodeSignedData } = require("../../lib/data");

const protocol = {
  name: "publish",
  version: "1.0.0",
};

const create = async (node, syncer) => {
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
      syncer.publish(dataPoint);
      console.log(dataPoint);

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
