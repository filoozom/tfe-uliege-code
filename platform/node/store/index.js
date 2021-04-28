const { readFile, writeFile } = require("fs/promises");
const path = require("path");

// Configuration
const STORE_FILE = "store.json";

// Cache
const DEFAULT_STORE = {
  subscriptions: {
    devices: [],
  },
};

const readStore = async (file) => {
  try {
    return JSON.parse(await readFile(file));
  } catch (err) {
    return {};
  }
};

const create = async (dir) => {
  const file = path.join(dir, STORE_FILE);
  const data = {
    ...DEFAULT_STORE,
    ...(await readStore(file)),
  };

  const get = (key) => data[key];
  const set = (key, value) => (data[key] = value);
  const save = async () => writeFile(file, JSON.stringify(data));

  return {
    get,
    set,
    save,
  };
};

module.exports = {
  create,
};
