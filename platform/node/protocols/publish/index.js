const path = require("path");
const { load } = require("protobufjs");
const PeerId = require("peer-id");

// Lib
const { formatProtocol } = require("../../lib/protocols");
const { readStream } = require("../../lib/streams");

const protocol = {
  name: "publish",
  version: "1.0.0",
};

const create = async (node) => {
  const root = await load(path.join(__dirname, "publish.proto"));
  const { SignedData, TimestampedMessage } = root;

  const decodeSignedData = async (buffer) => {
    const { source, signature, data } = SignedData.decode(buffer);
    const peerId = await PeerId.createFromPubKey(source);

    // Re-encode the TimestampedMessage to check its signature
    const message = TimestampedMessage.encode(data).finish();
    if (!(await peerId.pubKey.verify(message, signature))) {
      throw new Error("Invalid signature");
    }

    return { peerId, buffer, data };
  };

  node.handle(formatProtocol(protocol), async ({ stream }) => {
    // Close the write stream
    stream.sink([]);

    const reader = await readStream(stream);
    const { value, done } = await reader.next();

    if (done) {
      stream.close();
      return;
    }

    try {
      const dataPoint = await decodeSignedData(value);
      console.log({ dataPoint });

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
