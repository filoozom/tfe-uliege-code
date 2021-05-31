const { readFile, writeFile } = require("fs/promises");
const path = require("path");

// Configuration
const STORE_FILE = "store.json";

// Cache
const DEFAULT_STORE = {};

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

  // Generic fetch / store / save
  const get = (key) => data[key];
  const set = (key, value) => (data[key] = value);
  const save = async () => writeFile(file, JSON.stringify(data));
  const store = {
    get,
    set,
    save,
  };

  return {
    dataPoint: require("./data-point")(store),
    ...store,
  };
};

module.exports = {
  create,
};
