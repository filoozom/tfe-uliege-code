/* global artifacts */
require("dotenv").config();

// Artifacts
const Platform = artifacts.require("Platform");

module.exports = (deployer) => {
  const { LOCATION_MULTIPLIER, DATA_PRECISION } = process.env;

  deployer.deploy(Platform, LOCATION_MULTIPLIER, DATA_PRECISION);
};
