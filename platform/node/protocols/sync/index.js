// Lib
const { decodeSignedData } = require("../../lib/data");

// Functions
const formatTopic = (deviceId) => `device-${deviceId}`;

const create = async (node, store, requester) => {
  const handler = async ({ data }) => {
    try {
      const dataPoint = await decodeSignedData(data);
      store.dataPoint.write(dataPoint);
    } catch (err) {
      // Invalid data point
    }
  };

  const publish = async (dataPoint) => {
    const topic = formatTopic(dataPoint.peerId.toB58String());
    node.pubsub.publish(topic, dataPoint.raw);
    store.dataPoint.write(dataPoint);
  };

  const subscribe = async (device) => {
    // TODO: Differenciate between syncing and requesting
    // Right now, nodes that sync a particular device also
    // reply on requests. This makes sense, but the two processes
    // could be separated.
    // i.e.: I would like to fetch data from a device but
    // do not want to make it available to others.
    requester.subscribe(device);

    // Subscribe
    const topic = formatTopic(device);
    console.log("Subscribing to", topic);
    node.pubsub.on(topic, handler);
    return await node.pubsub.subscribe(topic);
  };

  const unsubscribe = async (device) => {
    const topic = formatTopic(device);
    console.log("Unubscribing from", topic);
    await node.pubsub.unsubscribe(topic);
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
