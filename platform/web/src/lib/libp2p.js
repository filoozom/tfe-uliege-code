import Libp2p from "libp2p";

// Transports
import WS from "libp2p-websockets";
import filters from "libp2p-websockets/src/filters";

// Multiplexer
import MPLEX from "libp2p-mplex";

// Encryption
import { NOISE } from "libp2p-noise";

// PubSub
import Gossipsub from "libp2p-gossipsub";

// Peer discovery
import Bootstrap from "libp2p-bootstrap";
import PubsubPeerDiscovery from "libp2p-pubsub-peer-discovery";

export const createNode = async () => {
  const transportKey = WS.prototype[Symbol.toStringTag];
  return await Libp2p.create({
    modules: {
      transport: [WS],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE],
      pubsub: Gossipsub,
      peerDiscovery: [Bootstrap, PubsubPeerDiscovery],
    },
    config: {
      transport: {
        [transportKey]: {
          // Transport properties -- Libp2p upgrader is automatically added
          filter: filters.all,
        },
      },
      peerDiscovery: {
        [Bootstrap.tag]: {
          list: [
            "/ip4/172.28.105.127/tcp/23400/ws/p2p/16Uiu2HAkzMvfQDWGMZ3r3HuhU3sgnZke6S7CyUMHqAkoJqXxi4pK",
          ],
          interval: 1000,
          enabled: true,
        },
        [PubsubPeerDiscovery.tag]: {
          enabled: true,
          interval: 1000,
        },
      },
    },
  });
};
