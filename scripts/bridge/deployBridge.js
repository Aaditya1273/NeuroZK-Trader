// Deploy SettlementGateway (source) and XLayerSettlementReceiver (dest)
// Usage examples (PowerShell):
//  $env:OWNER="0xOwner"; $env:RELAYER="0xRelayer"; $env:TREASURY="0xTreasury"; npx hardhat run scripts/bridge/deployBridge.js --network sepolia
//  For XLayer: npx hardhat run scripts/bridge/deployBridge.js --network xlayer

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address, "Network:", hre.network.name);

  const OWNER = process.env.OWNER || deployer.address;
  const RELAYER = process.env.RELAYER || deployer.address;
  const TREASURY = process.env.TREASURY || deployer.address;

  // Decide which contract to deploy based on network name
  // Convention: source networks deploy SettlementGateway, destination (xlayer) deploy XLayerSettlementReceiver
  if ((hre.network.name || "").toLowerCase().includes("xlayer")) {
    // Deploy XLayerSettlementReceiver on destination chain
    const Rx = await hre.ethers.getContractFactory("XLayerSettlementReceiver");
    const rx = await Rx.deploy(OWNER, RELAYER, TREASURY);
    await rx.deployed();
    console.log("XLayerSettlementReceiver:", rx.address);

    if (RELAYER !== deployer.address) {
      const tx = await rx.setRelayer(RELAYER);
      await tx.wait();
    }
    if (TREASURY !== deployer.address) {
      const tx2 = await rx.setTreasury(TREASURY);
      await tx2.wait();
    }
  } else {
    // Deploy SettlementGateway on source chain
    const Gw = await hre.ethers.getContractFactory("SettlementGateway");
    const gw = await Gw.deploy(OWNER);
    await gw.deployed();
    console.log("SettlementGateway:", gw.address);

    // authorize relayer/backend as caller
    const tx = await gw.setAuthorized(RELAYER, true);
    await tx.wait();
    console.log("Authorized:", RELAYER);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
