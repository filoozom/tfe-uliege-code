const Libp2p = require("libp2p");
const PeerId = require("peer-id");
const { join } = require("path");
const { readFile, writeFile, mkdir } = require("fs/promises");

// Transports
const WS = require("libp2p-websockets");
const TCP = require("libp2p-tcp");

// Multiplexer
const MPLEX = require("libp2p-mplex");

// Encryption
const { NOISE } = require("libp2p-noise");

// PubSub
const Gossipsub = require("libp2p-gossipsub");

// Peer discovery
const Bootstrap = require("libp2p-bootstrap");
const PubsubPeerDiscovery = require("libp2p-pubsub-peer-discovery");
const MDNS = require("libp2p-mdns");

// Configuration
const PEER_ID_FILE = "peer-id.json";

const loadPeerId = async (dir) => {
  const path = join(dir, PEER_ID_FILE);
  try {
    return PeerId.createFromJSON(JSON.parse(await readFile(path)));
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const peerId = await PeerId.create({ keyType: "secp256k1" });
  await writeFile(path, JSON.stringify(peerId.toJSON()));
  return peerId;
};

const createDataDir = (dir) => mkdir(dir, { recursive: true, mode: 0o700 });

const createNode = async (options) => {
  // Wait for the data dir to be created
  await createDataDir(options.dataDir);

  // Configuration
  const peerId = await loadPeerId(options.dataDir);
  const transport = [
    // For compatibility with browsers
    !options.disableWs && WS,

    // For direct communication
    !options.disableTcp && TCP,
  ].filter(Boolean);

  return await Libp2p.create({
    peerId,
    modules: {
      transport,
      streamMuxer: [MPLEX],
      connEncryption: [NOISE],
      pubsub: Gossipsub,
      peerDiscovery: [Bootstrap, PubsubPeerDiscovery, MDNS],
    },
    config: {
      peerDiscovery: {
        [Bootstrap.tag]: {
          list: options.bootstrap,
          interval: 1000,
          enabled: options.bootstrap.length && !options.disableBootstrap,
        },
        [PubsubPeerDiscovery.tag]: {
          enabled: !options.disablePubsubDiscovery,
          interval: 1000,
        },
        [MDNS.tag]: {
          enabled: !options.disableMdns,
          interval: 1000,
        },
      },
    },
  });
};

module.exports = {
  createNode,
};
