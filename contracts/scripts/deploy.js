const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // 1. Deploy AriaToken (ERC20)
  const AriaToken = await hre.ethers.getContractFactory("AriaToken");
  const ariaToken = await AriaToken.deploy();
  await ariaToken.waitForDeployment();
  const ariaTokenAddress = await ariaToken.getAddress();
  console.log(`AriaToken (ERC20) deployed to: ${ariaTokenAddress}`);

  // 2. Deploy AriaNFT (ERC721)
  const AriaNFT = await hre.ethers.getContractFactory("AriaNFT");
  const ariaNFT = await AriaNFT.deploy();
  await ariaNFT.waitForDeployment();
  const ariaNFTAddress = await ariaNFT.getAddress();
  console.log(`AriaNFT (ERC721) deployed to: ${ariaNFTAddress}`);

  // 3. Deploy MockQIEOracle
  const MockQIEOracle = await hre.ethers.getContractFactory("MockQIEOracle");
  const mockOracle = await MockQIEOracle.deploy();
  await mockOracle.waitForDeployment();
  const mockOracleAddress = await mockOracle.getAddress();
  console.log(`MockQIEOracle deployed to: ${mockOracleAddress}`);

  // 4. Deploy AriaMarketplace
  const AriaMarketplace = await hre.ethers.getContractFactory("AriaMarketplace");
  const ariaMarketplace = await AriaMarketplace.deploy(
    ariaNFTAddress, // Pass NFT contract address
    ariaTokenAddress, // Pass Token contract address
    18 // Pass Token decimals
  );
  await ariaMarketplace.waitForDeployment();
  const ariaMarketplaceAddress = await ariaMarketplace.getAddress();
  console.log(`AriaMarketplace deployed to: ${ariaMarketplaceAddress}`);

  // 5. Configure Marketplace with Oracle
  console.log("Configuring Marketplace...");
  const setOracleTx = await ariaMarketplace.setOracle(mockOracleAddress);
  await setOracleTx.wait();
  console.log("Oracle set in Marketplace");

  // 6. Deploy FractionalNFT
  const FractionalNFT = await hre.ethers.getContractFactory("FractionalNFT");
  const fractionalNFT = await FractionalNFT.deploy();
  await fractionalNFT.waitForDeployment();
  const fractionalNFTAddress = await fractionalNFT.getAddress();
  console.log(`FractionalNFT deployed to: ${fractionalNFTAddress}`);

  console.log("\nDeployment complete!");
  console.log({
    ariaToken: ariaTokenAddress,
    ariaNFT: ariaNFTAddress,
    mockOracle: mockOracleAddress,
    ariaMarketplace: ariaMarketplaceAddress,
    fractionalNFT: fractionalNFTAddress,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});