const path = require("path");
const { load } = require("protobufjs");

// Lib
const { formatProtocol } = require("../../lib/protocols");
const { writeStream } = require("../../lib/streams");

// Constants
const TEMPERATURE_DECIMALS = 1;
const HUMIDITY_DECIMALS = 1;

const protocol = {
  name: "publish",
  version: "1.0.0",
};

const lowerFirstLetter = (string) =>
  string.charAt(0).toLowerCase() + string.slice(1);

const create = async (node, target) => {
  const root = await load(path.join(__dirname, "publish.proto"));
  const { SignedData, TimestampedMessage, DataPoint } = root;

  const encodeDataPoint = (data) => DataPoint.create(data);

  const encodeTimestampedMessage = (type, data) =>
    TimestampedMessage.create({
      date: Math.round(Date.now() / 1000),
      [type]: data,
    });

  const encodeSignedData = async (payload) => {
    const type = lowerFirstLetter(payload.constructor.name);
    const data = encodeTimestampedMessage(type, payload);

    return SignedData.create({
      source: node.peerId.marshalPubKey(),
      signature: await node.peerId.privKey.sign(
        TimestampedMessage.encode(data).finish()
      ),
      data,
    });
  };

  const createSignedData = async (data) => {
    const dataPoint = encodeDataPoint(data);
    const signedData = await encodeSignedData(dataPoint);
    return SignedData.encode(signedData).finish();
  };

  const publish = async ({ temperature, humidity }) => {
    // Dial the publishing node
    const { stream } = await node.dialProtocol(
      target,
      formatProtocol(protocol)
    );

    // Format the data for Protobuf
    const data = await createSignedData({
      temperature: temperature * 10 ** TEMPERATURE_DECIMALS,
      humidity: humidity * 10 ** HUMIDITY_DECIMALS,
    });

    // Write the data point and end the stream
    const writer = await writeStream(stream);
    writer.write(data);
    writer.end();

    // Close both sides
    await stream.close();
  };

  return {
    publish,
  };
};

module.exports = {
  create,
};
