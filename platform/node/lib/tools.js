const { homedir } = require("os");
const path = require("path");

function parseDirectory(dir) {
  if (dir.startsWith("~")) {
    return path.join(homedir(), dir.slice(2));
  }

  return path.resolve(dir);
}

async function timeoutPromise(promise, ms, error) {
  return await Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(error), ms)),
  ]);
}

module.exports = {
  parseDirectory,
  timeoutPromise,
};
