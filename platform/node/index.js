const { program } = require("commander");
const { version } = require("./package.json");

// Lib
const { createNode } = require("./lib/libp2p");
const { parseDirectory } = require("./lib/tools");
const { create: createStore } = require("./store");

// Protocols
const ingest = require("./protocols/ingest");
const sync = require("./protocols/sync");
const syncDevices = require("./protocols/sync-devices");
const request = require("./protocols/request");

// API
const api = require("./api");

async function startNode(options) {
  const store = await createStore(options.dataDir);
  const node = await createNode(options);

  // Print peer discovery results
  node.on("peer:discovery", (peerId) => {
    console.log(`Found peer ${peerId.toB58String()}`);
  });

  // Print new connections to peers
  node.connectionManager.on("peer:connect", (connection) => {
    console.log(`Connected to ${connection.remotePeer.toB58String()}`);
  });

  // Print peers disconnecting
  node.connectionManager.on("peer:disconnect", (connection) => {
    console.log(`Disconnected from ${connection.remotePeer.toB58String()}`);
  });

  // Protocols
  const requester = await request.create(node, store);
  const syncer = await sync.create(node, store, requester);
  const deviceSyncer = await syncDevices.create(store);
  await ingest.create(node, store, syncer);

  // Start the node
  await node.start();
  await deviceSyncer.start();

  // Output listen addresses to the console
  console.log("Listener ready, listening on:");
  node.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + "/p2p/" + node.peerId.toB58String());
  });

  // Launch the API
  const app = await api.create({ store, syncer, requester });
  await app.listen(options.listenApi);

  // Add subscriptions
  for (const device of store.get("subscriptions:devices") || []) {
    syncer.subscribe(device);
  }
}

program
  .version(version)
  .option("-W, --disable-ws", "disable WebSockets")
  .option("-T, --disable-tcp", "disable TCP")
  .option("-M, --disable-mdns", "disable mDNS")
  .option("-B, --disable-bootstrap", "disable bootstrapping")
  .option("-P, --disable-pubsub-discovery", "disable PubSub discovery")
  .option("-b, --bootstrap [addresses...]", "bootstrap addresses", [
    // srv02.apyos.com
    "/dns4/srv02.apyos.com/tcp/23400/ws/p2p/16Uiu2HAmRPg4qGPc3cEdWpMiEbN9qUAv7cTnch6LnpfbySx7nkZv",
  ])
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
  .option(
    "-a, --listen-api <ip:port>",
    "listen address for the web API (host and port)",
    "127.0.0.1:34500"
  )

  .parse();

startNode(program.opts());
