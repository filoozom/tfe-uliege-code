# IoT Platform

This repository contains the proof of concept related to the protocol I proposed in my master thesis.

It includes the web interface, smart contracts and 3 components used in the protocol.

In general, all image can be ran in a Docker container.

## Web interface

### Run the code

```bash
cd web
docker build -t iot-platform/web .
docker run --rm -p 8080:80 iot-platform/web
```

Then navigate to http://localhost:8080, preferably on the latest stable Chrome version. The website should be opened on localhost or over HTTPS, as required by the Web Crypto API (https://github.com/libp2p/js-libp2p-crypto/blob/master/README.md#web-crypto-api).

### Configuration

The web application automatically connects to bootnodes specified in `src/lib/libp2p.js`. At the time of writing, a bootnode is made available online: `/dns4/srv02.apyos.com/tcp/23400/ws/p2p/16Uiu2HAmRPg4qGPc3cEdWpMiEbN9qUAv7cTnch6LnpfbySx7nkZv`. If the latter is not running anymore, another one will need to be configured in its place.

## Smart contracts

The `ethereum` folder contains all Ethereum smart contracts required by this platform. The `.env.sample` configuration file needs to be renamed to `.env`, and makes it possible to configure some aspects of the platform. A private key should be inserted. The other values can be kept to their defaults:

- `LOCATION_MULTIPLIER` set the precision of the location. A mutliplier of 100 means that locations are precise up to 2 digits, and thus a longitude of 12.34 is represented using the 1234 integer.
- `CAPACITY` set the number at which a rectangle of the Quadtree is split into 4 more rectangles.

### Deploy the contracts

```bash
cd ethereum
npm i
npx truffle deploy --network goerli
npx truffle run verify --network goerli Platform
```

### Run unit tests

```bash
cd ethereum
npm i
npx ganache-cli -i 123456   # Launches a private Ethereum testnet
npx truffle test            # Runs the tests on the private testnet
```

## Comoponents

Each component can be ran in Docker and contains a help command, that shows all available configuration flags:

```
docker build -t iot-platform/COMPONENT .
docker run --rm iot-platform/COMPONENT --help
```

Running the code in Docker makes it easy to spin up a lot of services quickly on the same machine. For example, to launch 100 ephemeral nodes:

```bash
for i in $(seq 0 99)
do
  docker run -d --rm -p $(expr 12300 + $i):12300 -p $(expr 23400 + $i):23400 iot-platform/node
done
```

### Sensor

#### Run the code

```bash
cd sensor
docker build -t iot-platform/sensor .
docker run --rm iot-platform/sensor -i INGESTOR_ADDRESS -t TEMPERATURE -h HUMIDITY
```

### Ingestor

#### Run the code

```bash
cd ingestor
docker build -t iot-platform/ingestor .
docker run --rm -p 45600:45600 iot-platform/ingestor -t NODE_ADDRESS
```

In order to keep the identity:

```
docker run --rm -v $(pwd)/ingestor:/ingestor iot-platform/ingestor -d /ingestor
```

### Node

#### Run the code

```bash
cd node
docker build -t iot-platform/node .
docker run --rm -p 12300:12300 -p 23400:23400 iot-platform/node
```

To access the private REST API, it needs to be bound to all interfaces and a port forwarding rule needs to be added to the Docker command:

```bash
docker run --rm -p 12300:12300 -p 23400:23400 -p 34500:34500 iot-platform/node -a 0.0.0.0:34500
```

In order to keep the identity:

```
docker run --rm -v $(pwd)/node:/node iot-platform/node -d /node
```
