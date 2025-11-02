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

  // 3. Deploy AriaMarketplace
  const AriaMarketplace = await hre.ethers.getContractFactory("AriaMarketplace");
  const ariaMarketplace = await AriaMarketplace.deploy(
    ariaNFTAddress, // Pass NFT contract address
    ariaTokenAddress // Pass Token contract address
  );
  await ariaMarketplace.waitForDeployment();
  const ariaMarketplaceAddress = await ariaMarketplace.getAddress();
  console.log(`AriaMarketplace deployed to: ${ariaMarketplaceAddress}`);

  console.log("\nDeployment complete!");
  console.log({
    ariaToken: ariaTokenAddress,
    ariaNFT: ariaNFTAddress,
    ariaMarketplace: ariaMarketplaceAddress,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});