// Lib
const { decodeSignedData } = require("../../lib/data");

// Functions
const formatTopic = (deviceId) => `device-${deviceId}`;

const create = async (node) => {
  const handler = async ({ data }) => {
    try {
      const dataPoint = await decodeSignedData(data);
      console.log(dataPoint);
    } catch (err) {
      // Invalid data point
    }
  };

  const publish = async (data) => {
    const topic = formatTopic(data.peerId.toB58String());
    node.pubsub.publish(topic, data.raw);
  };

  const subscribe = async (device) => {
    const topic = formatTopic(device);
    console.log("Subscribing to", topic);
    node.pubsub.on(topic, handler);
    return await node.pubsub.subscribe(topic);
  };

  const unsubscribe = async (device) => {
    await node.pubsub.unsubscribe(formatTopic(device));
  };

  return {
    publish,
    subscribe,
    unsubscribe,
  };
};

module.exports = {
  create,
};
