const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Oracle-only deployment to", hre.network.name, "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Existing Marketplace Address from README/Previous deployment
  const MARKETPLACE_ADDRESS = "0xD504D75D5ebfaBEfF8d35658e85bbc52CC66d880"; 

  console.log("🔮 Deploying QIEOracleTestnet (AggregatorV3-compatible)...");
  
  const QIEOracle = await hre.ethers.getContractFactory("QIEOracleTestnet");
  const oracle = await QIEOracle.deploy(
    "ARIA / USD", // description
    8 // decimals (same as real QIE Oracle)
  );
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`✅ QIEOracleTestnet deployed to: ${oracleAddress}\n`);
  
  // Set initial price: $0.50 = 50000000 (8 decimals)
  console.log("💰 Setting initial ARIA/USD price...");
  const updateTx = await oracle.updateAnswer(50000000); // $0.50
  await updateTx.wait();
  console.log("✅ ARIA/USD set to $0.50\n");

  // Connect oracle to marketplace
  console.log(`🔗 Connecting oracle to marketplace at ${MARKETPLACE_ADDRESS}...`);
  const Marketplace = await hre.ethers.getContractFactory("AriaMarketplace");
  const marketplace = Marketplace.attach(MARKETPLACE_ADDRESS);
  
  const setOracleTx = await marketplace.setOracle(oracleAddress);
  await setOracleTx.wait();
  console.log("✅ Oracle connected to Marketplace\n");

  console.log("🎉 Deployment and configuration complete!");
  console.log(`Oracle Address: ${oracleAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
