// Lib
const { decodeSignedData } = require("../../lib/data");

// Functions
const formatTopic = (deviceId) => `device-${deviceId}`;

const create = async (node, store, requester) => {
  const storeDataPoint = async (dataPoint) => {
    console.log({ ...dataPoint, peerId: dataPoint.peerId.toB58String() });

    // TODO: Add a check of whether this should be stored or not
    const key = `device:data:${dataPoint.peerId.toB58String()}`;
    const add = {
      date: dataPoint.data.date,
      data: dataPoint.data.dataPoint,
      raw: dataPoint.raw,
    };
    const points = store.get(key) || [];

    // Insert the data point and keep the array sorted
    store.set(
      key,
      [add, ...points].sort((a, b) => b.date - a.date)
    );

    // Save to the store
    await store.save();
  };

  const handler = async ({ data }) => {
    try {
      const dataPoint = await decodeSignedData(data);
      storeDataPoint(dataPoint);
    } catch (err) {
      // Invalid data point
    }
  };

  const publish = async (dataPoint) => {
    const topic = formatTopic(dataPoint.peerId.toB58String());
    node.pubsub.publish(topic, dataPoint.raw);
    storeDataPoint(dataPoint);
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
