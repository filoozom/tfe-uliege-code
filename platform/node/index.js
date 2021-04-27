const { program } = require("commander");
const { version } = require("./package.json");

// Lib
const { createNode } = require("./lib/libp2p");
const { parseDirectory } = require("./lib/tools");

// Protocols
const request = require("./protocols/request");
const publish = require("./protocols/publish");

async function startNode(options) {
  console.log(options);

  const node = await createNode(options);

  /*
  node.on("peer:discovery", (peerId) => {
    console.log("found peer:", peerId.toB58String());
  });

  node.connectionManager.on("peer:connect", (connection) => {
    console.log("connected to:", connection.remotePeer.toB58String());
  });
  */

  const publisher = await publish.create(node);

  await node.start();

  const devices = ["a", "b", "c"];
  const requester = await request.create(node);
  for (const device of devices) {
    requester.subscribe(device);
  }

  // Output listen addresses to the console
  console.log("Listener ready, listening on:");
  node.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + "/p2p/" + node.peerId.toB58String());
  });
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
    parseDirectory("~/.iot-platform/node")
  )
  .option(
    "-w, --listen-wss <ip:port>",
    "listen address for secure WebSockets (host and port)",
    "127.0.0.1:23400"
  )
  .option(
    "-t, --listen-tcp <ip:port>",
    "listen address for TCP connections (host and port)",
    "127.0.0.1:12300"
  )
  .parse();

startNode(program.opts());
