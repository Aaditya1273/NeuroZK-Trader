process.env.HARDHAT_DISABLE_TELEMETRY = process.env.HARDHAT_DISABLE_TELEMETRY || "1";
require("@nomicfoundation/hardhat-toolbox");
require("@typechain/hardhat");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
    xlayer: {
      url: process.env.XLAYER_RPC_URL || "",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};
