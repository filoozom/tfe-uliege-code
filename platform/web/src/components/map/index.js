import { useEffect, useState } from "preact/hooks";
import { useWindowSize } from "react-use";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvent,
} from "react-leaflet";

// Style
import style from "./style";

// Lib
import { decodeSignedData } from "../../lib/data";

const position = [50.586073694936566, 5.560206153520874];

function Registration({ onRegister }) {
  const [coordinates, setCoordinates] = useState();
  const [id, setId] = useState();

  useMapEvent("click", ({ latlng }) => {
    setCoordinates(latlng);
  });

  if (!coordinates) {
    return;
  }

  const handleRef = (ref) => {
    ref.openPopup(coordinates);
  };

  const onSubmit = (event) => {
    onRegister({ id, coordinates: [coordinates.lat, coordinates.lng] });
    event.preventDefault();
  };

  return (
    <Marker position={coordinates}>
      <Popup ref={handleRef}>
        <form class={style.popup} onSubmit={onSubmit}>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <button type="submit">Register</button>
        </form>
      </Popup>
    </Marker>
  );
}

function OnMove({ onMove }) {
  const map = useMapEvent("moveend", () => {
    onMove(map.getBounds());
  });
  useEffect(() => {
    onMove(map.getBounds());
  }, []);
}

function DevicePopup({ device, node }) {
  const [data, setData] = useState();

  const handler = async ({ data }) => {
    try {
      const dataPoint = await decodeSignedData(data);
      setData(dataPoint.data.dataPoint);
    } catch (err) {
      // Invalid data point
      console.log(err);
    }
  };

  const topic = `device-${device.id}`;
  const onClose = () => node.pubsub.unsubscribe(topic);
  const onOpen = () => {
    console.log("Subscribing to", topic);
    node.pubsub.on(topic, handler);
    node.pubsub.subscribe(topic);
  };

  return (
    <Popup onOpen={onOpen} onClose={onClose}>
      <p>Owner: {device.owner}</p>
      <p>ID: {device.id}</p>
      {data && (
        <p>
          Temperature: {data.temperature / 10}°C
          <br />
          Humidity: {data.humidity / 10}°C
        </p>
      )}
    </Popup>
  );
}

export default function Map({ devices = [], onRegister, onMove, node }) {
  const { height } = useWindowSize();

  return (
    <div style={{ height: height - 60 }}>
      <MapContainer center={position} zoom={13} style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {devices.map((device) => (
          <Marker key={device.id} position={device.coordinates}>
            <DevicePopup device={device} node={node} />
          </Marker>
        ))}

        <Registration onRegister={onRegister} />
        <OnMove onMove={onMove} />
      </MapContainer>
    </div>
  );
}
