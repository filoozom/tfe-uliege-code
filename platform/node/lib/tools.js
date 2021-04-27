const { homedir } = require("os");
const path = require("path");

function parseDirectory(dir) {
  if (dir.startsWith("~")) {
    return path.join(homedir(), dir.slice(2));
  }

  return path.resolve(dir);
}

module.exports = {
  parseDirectory,
};
