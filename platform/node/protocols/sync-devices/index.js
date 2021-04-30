const config = require("config");
const { ethers } = require("ethers");
const PeerId = require("peer-id");

// ABI
const abi = require("./abi.json");

const cleanOutput = (object) => {
  const result = { ...object };
  for (const [key, value] of Object.entries(result)) {
    if (!isNaN(Number(key))) {
      delete result[key];
    } else if (typeof value === "object") {
      result[key] = cleanOutput(value);
    }
  }
  return result;
};

const create = async (store) => {
  const provider = new ethers.getDefaultProvider(
    config.get("ethers.network"),
    config.get("ethers.providers")
  );
  const { address } = config.get("contract");
  const contract = new ethers.Contract(address, abi, provider);
  const filter = contract.filters.NewDevice();
  const locationMultiplier = await contract.LOCATION_MULTIPLIER();

  // Handle race conditions between fetch and events
  const queue = [];
  let upToDate = false;

  // TODO: Don't copy devices over and over again, instead
  // just edit them in place.
  const insertEvent = async (blockNumber, device) => {
    const devices = store.get("contract:devices") || {};

    // Transcode id from hex to base58
    const peerId = await PeerId.createFromHexString(device.id.slice(2));
    device.id = peerId.toB58String();

    // Transpose coordinates
    device.coordinates = {
      latitude: device.coordinates.latitude / locationMultiplier,
      longitude: device.coordinates.longitude / locationMultiplier,
    };

    // Set data in the store
    store.set("events:new-devices:blockNumber", blockNumber);
    store.set("contract:devices", { ...devices, [device.id]: device });
  };

  const handleEvent = (event) => {
    return insertEvent(event.blockNumber, cleanOutput(event.args));
  };

  // NOTICE: Order is not too important for now, but
  // might as well plan ahead in case.
  const fetchEvents = async () => {
    // Fetch the highest block in store
    const blockNumber = store.get("events:new-devices:blockNumber") || 0;
    const events = await contract.queryFilter(filter, blockNumber);

    // Handle in order so that we can't miss any in case of errors
    // Can be optimized
    for (const event of events) {
      await handleEvent(event);
    }

    // Empty the event queue
    let event;
    while ((event = queue.shift())) {
      await handleEvent(event);
    }

    await store.save();
    upToDate = true;
  };

  const syncEvents = () => {
    contract.on(filter, (_, __, ___, event) =>
      upToDate ? handleEvent(event) : queue.push(event)
    );
  };

  const start = () => {
    syncEvents();
    fetchEvents();
  };

  return {
    start,
  };
};

module.exports = {
  create,
};
