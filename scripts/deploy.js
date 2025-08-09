const hre = require("hardhat");

async function main() {
  // The official EntryPoint address on the Sepolia testnet.
  // Replace with the appropriate address for your target network.
  const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  console.log("Deploying SmartAccountFactory...");

  const SmartAccountFactory = await hre.ethers.getContractFactory("SmartAccountFactory");
  const smartAccountFactory = await SmartAccountFactory.deploy(entryPointAddress);

  await smartAccountFactory.deployed();

  console.log(
    `SmartAccountFactory deployed to: ${smartAccountFactory.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
