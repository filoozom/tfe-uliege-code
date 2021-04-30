/* global ethereum */
import { useState, useEffect } from "preact/hooks";

// Style
import "./style";

// Components
import Map from "./components/map";

// Libp2p
import { createNode } from "./lib/libp2p";
import PeerId from "peer-id";

// Ethereum
import { ethers } from "ethers";
import abi from "./config/abi.json";

const provider = new ethers.providers.Web3Provider(ethereum);
const address = "0xcb20cb08475edc9b4b1652a879f20c8d13fc6483";

// Functions
const loc = (loc) => Math.ceil(loc * 10 ** 6);
const fromCoords = (coords) => coords.map(loc);
const toCoords = (coords) => coords.map((value) => value / 10 ** 6);
const connectWallet = () =>
  ethereum.request({
    method: "eth_requestAccounts",
  });

export default function App() {
  const [node, setNode] = useState();
  const [devices, setDevices] = useState();
  const [accounts, setAccounts] = useState();
  const account = (accounts || [])[0];

  // Keep the currently connected account in sync
  useEffect(() => {
    ethereum.on("accountsChanged", setAccounts);
    provider.listAccounts().then(setAccounts);
    return () => ethereum.off("accountsChanged", setAccounts);
  }, []);

  // Create the libp2p node
  useEffect(() => createNode().then(setNode), []);

  // libp2p tests
  useEffect(() => {
    if (!node) {
      return;
    }

    node.on("peer:discovery", async (peerId) => {
      console.log(`Found peer ${peerId.toB58String()}`);

      const conn = await node.dial(peerId);
      console.log(conn);
    });

    // Listen for new connections to peers
    node.connectionManager.on("peer:connect", (connection) => {
      console.log(`Connected to ${connection.remotePeer.toB58String()}`);
    });

    // Listen for peers disconnecting
    node.connectionManager.on("peer:disconnect", (connection) => {
      console.log(`Disconnected from ${connection.remotePeer.toB58String()}`);
    });

    (async () => {
      await node.start();

      node.pubsub.on(
        "device-16Uiu2HAm3N2xSLXyrd4hqZ8kVLcyr2okm82Cc8VXrQTdShnnyK5X",
        console.log
      );
      await node.pubsub.subscribe(
        "device-16Uiu2HAm3N2xSLXyrd4hqZ8kVLcyr2okm82Cc8VXrQTdShnnyK5X"
      );
    })();
  }, [node]);

  // Register a device
  const onRegister = async ({ id, coordinates }) => {
    const contract = new ethers.Contract(address, abi, provider.getSigner(0));

    try {
      const peerId = await PeerId.createFromB58String(id);
      contract.register(`0x${peerId.toHexString()}`, fromCoords(coordinates), {
        gasLimit: 2500000,
      });
    } catch (err) {
      console.log(err);
    }
  };

  // Search for devices in the map's current bounding box
  const onMove = async (location) => {
    const center = location.getCenter();
    const width = Math.abs((location.getEast() - location.getWest()) / 2);
    const height = Math.abs((location.getNorth() - location.getSouth()) / 2);

    const contract = new ethers.Contract(address, abi, provider);
    let [devices] = await contract.find(
      fromCoords([center.lat, center.lng, width, height]),
      100
    );

    // Remove empty devices and format them correctly
    devices = devices
      .filter(({ owner }) => owner !== ethers.constants.AddressZero)
      .map(({ owner, id, coordinates }) => ({
        owner,
        id: PeerId.createFromHexString(id.slice(2)).toB58String(),
        coordinates: toCoords(coordinates),
      }));

    setDevices(devices);
  };

  return (
    <div>
      <nav>
        <button onClick={connectWallet}>{account || "Connect wallet"}</button>
      </nav>
      <Map devices={devices} onRegister={onRegister} onMove={onMove} />
    </div>
  );
}
