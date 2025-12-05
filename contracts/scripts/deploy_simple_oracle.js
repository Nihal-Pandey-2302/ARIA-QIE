const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SimpleOracle with account:", deployer.address);

  const SimpleOracle = await ethers.getContractFactory("SimpleOracle");
  const oracle = await SimpleOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();

  console.log("SimpleOracle deployed to:", oracleAddress);

  // Set initial price
  const PAIR = "ARIA/USD";
  const PRICE = 50000000; // $0.50
  console.log(`Setting price for ${PAIR} to ${PRICE}...`);
  await oracle.updatePrice(PAIR, PRICE);

  // Update Marketplace
  const MARKETPLACE_ADDRESS = "0xD504D75D5ebfaBEfF8d35658e85bbc52CC66d880";
  const Marketplace = await ethers.getContractFactory("AriaMarketplace");
  const marketplace = Marketplace.attach(MARKETPLACE_ADDRESS);

  console.log("Updating Marketplace oracle...");
  const tx = await marketplace.setOracle(oracleAddress);
  await tx.wait();

  console.log("Marketplace oracle updated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
