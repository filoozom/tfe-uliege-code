const net = require("net");
const { program } = require("commander");
const { version } = require("./package.json");

// Lib
const { createNode } = require("./lib/libp2p");
const { parseDirectory } = require("./lib/tools");

// Protocols
const ingest = require("./protocols/ingest");

// Functions
function getTemperature(buffer) {
  return buffer.readInt32LE() / 10;
}

function getHumidity(buffer) {
  return buffer.readUInt32LE(4) / 10;
}

async function start(options) {
  const node = await createNode(options);
  const ingestor = await ingest.create(node, options.target);

  const server = net.createServer((socket) => {
    socket.on("data", (data) => {
      const temperature = getTemperature(data);
      const humidity = getHumidity(data);

      ingestor.publish({ temperature, humidity });
    });
  });

  const [host, port] = options.listen.split(":");
  server.listen(parseInt(port), host);
}

program
  .version(version)
  .option("-W, --disable-ws", "disable WebSockets")
  .option("-T, --disable-tcp", "disable TCP")
  .option("-M, --disable-mdns", "disable mDNS")
  .option("-B, --disable-bootstrap", "disable bootstrapping")
  .option("-P, --disable-pubsub-discovery", "disable PubSub discovery")
  .option("-b, --bootstrap [addresses...]", "bootstrap addresses", [])
  .option(
    "-d, --data-dir <directory>",
    "data directory",
    parseDirectory,
    parseDirectory("~/.iot-platform/ingestor")
  )
  .option("-l, --listen <host:port>", "listen address", "127.0.0.1:45600")
  .requiredOption("-t, --target <multiAddress>", "target node")
  .parse();

start(program.opts());
