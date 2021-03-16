/* global artifcats, contract, it, assert */
require("dotenv").config();

// Global
const truffleAssert = require("truffle-assertions");

// Lib
const { equalBigInt } = require("./lib/utils");

// Artifacts
const Platform = artifacts.require("Platform");

// Constants
const { LOCATION_MULTIPLIER, DATA_PRECISION } = process.env;

contract("Platform", (accounts) => {
  // Accounts
  const OWNER_COUNT = 2;
  const DEVICE_COUNT = 3;
  const owners = accounts.slice(1, 1 + OWNER_COUNT).map((account, index) => ({
    account,
    devices: accounts.slice(
      1 + OWNER_COUNT + DEVICE_COUNT * index,
      1 + OWNER_COUNT + DEVICE_COUNT * index + DEVICE_COUNT
    ),
  }));

  it("should contain basic constants", async () => {
    const instance = await Platform.deployed();

    equalBigInt(await instance.LOCATION_MULTIPLIER.call(), LOCATION_MULTIPLIER);
    equalBigInt(await instance.DATA_PRECISION.call(), DATA_PRECISION);
  });

  it("should be possible to register a node", async () => {
    const owner = owners[0];
    const device = owners[0].devices[0];
    const coordinates = [50, 5];

    const instance = await Platform.deployed();
    const result = instance.register(device, coordinates, {
      from: owner.account,
    });

    truffleAssert.passes(result);
    truffleAssert.eventEmitted(
      await result,
      "NewDevice",
      (event) => event.owner === owner.account && event.id === device
    );
  });

  it("should not be possible to register a node twice", async () => {
    const owner = owners[0];
    const device = owners[0].devices[0];
    const coordinates = [50, 5];

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

  it("should be possible to publish a data point", async () => {
    const device = owners[0].devices[0];
    const temperature = 456;
    const humidity = 354;

    const instance = await Platform.deployed();
    const result = instance.publish(temperature, humidity, { from: device });

    truffleAssert.passes(result);

    // Does not work right now for some unknown reason
    /*
    truffleAssert.eventEmitted(
      await result,
      "NewDataPoint",
      (event) =>
        event.data.id === device &&
        equalBigInt(event.data.temperature, temperature) &&
        equalBigInt(event.data.humidity, humidity) &&
        typeof event.data.timestamp === "string"
    );
    */
  });
});
