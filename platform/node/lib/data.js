const path = require("path");
const { load } = require("protobufjs");
const PeerId = require("peer-id");

// Cache
let PROTO_CACHE;

const getProto = async () => {
  if (!PROTO_CACHE) {
    PROTO_CACHE = await load(path.join(__dirname, "../protocols/data.proto"));
  }

  return PROTO_CACHE;
};

const decodeSignedData = async (raw) => {
  const { SignedData, TimestampedMessage } = await getProto();
  const { source, signature, data } = SignedData.decode(raw);
  const peerId = await PeerId.createFromPubKey(source);

  // Re-encode the TimestampedMessage to check its signature
  const message = TimestampedMessage.encode(data).finish();
  if (!(await peerId.pubKey.verify(message, signature))) {
    throw new Error("Invalid signature");
  }

  return { raw, peerId, data };
};

module.exports = {
  decodeSignedData,
};
