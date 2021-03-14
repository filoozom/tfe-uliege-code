const crypto = require("crypto");
const { load } = require("protobufjs");
const PeerId = require("peer-id");

const peerIds = require("./peer-ids");

function hash(data, digest) {
  return crypto.createHash("sha256").update(data).digest(digest);
}

function lowerFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

const Proto = (peerId, root) => {
  const { DataPoint, SignedData, TimestampedMessage } = root;

  const encode = (type, data) => {
    const instance = type.create(data);
    console.log({ instance });
    console.log(type.encode(instance).finish());
    return type.encode(instance).finish();
  };

  const encodeTimestampedMessage = (type, data) =>
    TimestampedMessage.create({
      date: Math.round(Date.now() / 1000),
      [type]: data,
    });

  return {
    async encodeDataPoint(data) {
      return DataPoint.create(data);
    },
    async encodeSignedData(payload) {
      const type = lowerFirstLetter(payload.constructor.name);
      const data = encodeTimestampedMessage(type, payload);
      return SignedData.create({
        source: peerId.toBytes(),
        signature: await peerId.privKey.sign(
          TimestampedMessage.encode(data).finish()
        ),
        data,
      });
    },
  };
};

// Script
(async () => {
  const peerId = await PeerId.createFromJSON(peerIds[0]);

  const root = await load("iot.proto");
  const proto = Proto(peerId, root);

  const previous = await hash("test");
  console.log({ previous });

  const data = await proto.encodeDataPoint({
    previous,
    temperature: 365,
    humidity: 459,
  });

  const { SignedData } = root;
  const signedData = await proto.encodeSignedData(data);
  const signed = SignedData.encode(signedData).finish();
  const hashed = hash(signed, "hex");

  console.log({
    data,
    signed,
    signedData,
    hashed,
    signedLength: signed.length,
  });
  console.log(SignedData.decode(signed));
})();
