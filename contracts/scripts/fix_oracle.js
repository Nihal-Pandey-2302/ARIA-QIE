const { ethers } = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0xB4aa30A3D8275C4DC7d727aDa604e6ae6BF5501D";
  const PAIR = "ARIA/USD";
  const PRICE = 50000000; // $0.50 scaled by 1e8

  const [deployer] = await ethers.getSigners();
  console.log("Updating oracle with account:", deployer.address);

  const Oracle = await ethers.getContractFactory("QIEOracleTestnet");
  const oracle = Oracle.attach(ORACLE_ADDRESS);

  console.log(`Setting price for ${PAIR} to ${PRICE}...`);
  const tx = await oracle.updatePrice(PAIR, PRICE);
  await tx.wait();

  console.log("Price updated successfully!");
  
  const [price, timestamp] = await oracle.getLatestPrice(PAIR);
  console.log("New Price:", price.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
