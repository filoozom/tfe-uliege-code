const HDWalletProvider = require("@truffle/hdwallet-provider");

// Load environment variables
require("dotenv").config();

// Configuration environment variables
const { PRIVATE_KEY } = process.env;

module.exports = {
  compilers: {
    solc: {
      version: "0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },

  plugins: ["truffle-plugin-verify"],

  api_keys: {
    etherscan: "A4FC1Q7R54FH9XFPSD731XNR3I1VXDKWU2",
  },

  networks: {
    goerli: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: [PRIVATE_KEY],
          numberOfAddresses: 1,
          providerOrUrl: "http://srv02.apyos.com:8545",
          pollingInterval: 8000,
        }),
      network_id: 5,
      confirmations: 1,
    },
    kovan: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: [PRIVATE_KEY],
          numberOfAddresses: 1,
          providerOrUrl:
            "wss://kovan.infura.io/ws/v3/7d41a9e494734b098a15c2da59724cd9",
        }),
      network_id: 42,
      confirmations: 1,
    },
    test: {
      host: "localhost",
      port: 8545,
      network_id: "1615900567218",
    },
  },
};
