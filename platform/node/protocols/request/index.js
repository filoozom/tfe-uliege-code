const create = async (node) => {
  const handler = (msg) => {};
  const subscribe = async (topic) => {
    node.pubsub.on(topic, handler);
    return await node.pubsub.subscribe(topic);
  };

  return { subscribe };
};

module.exports = {
  create,
};
