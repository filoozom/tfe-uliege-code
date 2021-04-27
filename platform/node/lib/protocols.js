function formatProtocol({ name, version }) {
  return ["", "iot-platform", name, version].join("/");
}

module.exports = {
  formatProtocol,
};
