/* global artifcats, contract, it, assert */
require("dotenv").config();

// Global
const truffleAssert = require("truffle-assertions");
const PeerId = require("peer-id");

// Lib
const { equalBigInt } = require("./lib/utils");

// Artifacts
const Platform = artifacts.require("Platform");

// Constants
const { LOCATION_MULTIPLIER } = process.env;

// Functions
function formatCoordinates({ latitude, longitude }) {
  return { latitude, longitude };
}

function formatDevice({ owner, id, coordinates }) {
  return {
    owner,
    id,
    coordinates: formatCoordinates(coordinates),
  };
}

function assertSameDevice(found, expected) {
  assert.deepEqual(formatDevice(found), expected);
}

function assertDeviceCount({ devices, count }, expected) {
  let counted = 0;
  for (const device of devices) {
    if (device.owner !== "0x0000000000000000000000000000000000000000") {
      counted++;
    } else {
      break;
    }
  }
  assert.equal(counted, expected);
  assert.equal(count, expected);
}

const loc = (number) => (number * LOCATION_MULTIPLIER).toString();
const getPeerId = async () =>
  "0x" + (await PeerId.create({ keyType: "secp256k1" })).toHexString();

contract("Platform", async (accounts) => {
  // Accounts
  const OWNER_COUNT = 2;
  const DEVICE_COUNT = 3;
  const owners = await Promise.all(
    accounts.slice(1, 1 + OWNER_COUNT).map(async (account) => ({
      account,
      devices: await Promise.all(
        Array(DEVICE_COUNT)
          .fill(0)
          .map(getPeerId)
      ),
    }))
  );

  it("should contain basic constants", async () => {
    const instance = await Platform.deployed();

    equalBigInt(await instance.LOCATION_MULTIPLIER.call(), LOCATION_MULTIPLIER);
  });

  it("should be possible to register a node and find it", async () => {
    const owner = owners[0];
    const device = owners[0].devices[0];
    const coordinates = [50, 5].map(loc);

    const instance = await Platform.deployed();
    const register = instance.register(device, coordinates, {
      from: owner.account,
    });

    truffleAssert.passes(register);
    truffleAssert.eventEmitted(
      await register,
      "NewDevice",
      (event) =>
        event.owner === owner.account &&
        event.id === device &&
        event.coordinates[0] === coordinates[0] &&
        event.coordinates[1] === coordinates[1]
    );

    const find = instance.find([49, 4, 10, 10].map(loc), 2);

    truffleAssert.passes(find);
    assertSameDevice((await find).devices[0], {
      owner: owner.account,
      id: device,
      coordinates: {
        latitude: coordinates[0],
        longitude: coordinates[1],
      },
    });
    assertSameDevice((await find).devices[1], {
      owner: "0x0000000000000000000000000000000000000000",
      id: "0x",
      coordinates: {
        latitude: "0",
        longitude: "0",
      },
    });
  });

  it("should not be possible to register a node twice", async () => {
    const owner = owners[0];
    const device = owners[0].devices[0];
    const coordinates = [50, 5].map(loc);

    const instance = await Platform.deployed();
    const register = () =>
      instance.register(device, coordinates, { from: owner.account });

    const result = register();

    truffleAssert.fails(
      result,
      truffleAssert.ErrorType.REVERT,
      "This device is already registered"
    );
  });

  it("should be possible to insert 20 nodes and find them", async function() {
    this.timeout(30000);

    const owner = owners[0];
    const devices = await Promise.all(
      Array(20)
        .fill(0)
        .map(() => getPeerId())
    );

    const instance = await Platform.deployed();
    const registrations = devices.map((device, index) => {
      const result = instance.register(
        device,
        [50 + index, 5 - index].map(loc),
        {
          from: owner.account,
        }
      );
      truffleAssert.passes(result);
      return result;
    });

    const queries = [
      {
        query: [-90, -180, 180, 360].map(loc),
        expect: 21,
      },
      {
        query: [50, 0, 5, 5].map(loc),
        expect: 7,
      },
      {
        query: [65, -10, 2, 2].map(loc),
        expect: 5,
      },
    ];

    await Promise.all(registrations);

    for (const { query, expect } of queries) {
      const result = instance.find(query, 25);
      truffleAssert.passes(result);
      assertDeviceCount(await result, expect);
    }
  });
});
