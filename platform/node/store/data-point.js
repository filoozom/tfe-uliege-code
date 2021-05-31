module.exports = (store) => {
  const write = async (dataPoint) => {
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

  return { write };
};
