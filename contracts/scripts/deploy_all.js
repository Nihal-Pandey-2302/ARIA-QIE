const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting full deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // ========== 1. Deploy AriaToken ==========
  console.log("📦 Deploying AriaToken...");
  const AriaToken = await hre.ethers.getContractFactory("AriaToken");
  const ariaToken = await AriaToken.deploy();
  await ariaToken.waitForDeployment();
  const ariaTokenAddress = await ariaToken.getAddress();
  console.log(`✅ AriaToken deployed to: ${ariaTokenAddress}\n`);

  // ========== 2. Deploy AriaNFT ==========
  console.log("🖼️  Deploying AriaNFT...");
  const AriaNFT = await hre.ethers.getContractFactory("AriaNFT");
  const ariaNFT = await AriaNFT.deploy();
  await ariaNFT.waitForDeployment();
  const ariaNFTAddress = await ariaNFT.getAddress();
  console.log(`✅ AriaNFT deployed to: ${ariaNFTAddress}\n`);

  // ========== 3. Deploy AriaMarketplace ==========
  console.log("🏪 Deploying AriaMarketplace...");
  const AriaMarketplace = await hre.ethers.getContractFactory("AriaMarketplace");
  const ariaMarketplace = await AriaMarketplace.deploy(
    ariaNFTAddress,
    ariaTokenAddress
  );
  await ariaMarketplace.waitForDeployment();
  const ariaMarketplaceAddress = await ariaMarketplace.getAddress();
  console.log(`✅ AriaMarketplace deployed to: ${ariaMarketplaceAddress}\n`);

  // ========== 4. Deploy FractionalNFT ==========
  console.log("🧩 Deploying FractionalNFT...");
  const FractionalNFT = await hre.ethers.getContractFactory("FractionalNFT");
  const fractionalNFT = await FractionalNFT.deploy();
  await fractionalNFT.waitForDeployment();
  const fractionalAddress = await fractionalNFT.getAddress();
  console.log(`✅ FractionalNFT deployed to: ${fractionalAddress}\n`);

  // ========== Save Deployment Info ==========
  const deploymentData = {
    network: hre.network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      AriaToken: ariaTokenAddress,
      AriaNFT: ariaNFTAddress,
      AriaMarketplace: ariaMarketplaceAddress,
      FractionalNFT: fractionalAddress,
    },
  };

  const outputPath = path.join(__dirname, "../deployment-all.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("💾 Deployment info saved to deployment-all.json\n");

  // ========== Update Backend ==========
  console.log("📝 Updating backend/contract_info.py...");
  const backendPath = path.join(__dirname, "../../backend/contract_info.py");
  let backend = fs.readFileSync(backendPath, "utf8");

  backend = backend.replace(
    /ARIATOKEN_ADDRESS\s*=\s*".*"/,
    `ARIATOKEN_ADDRESS = "${ariaTokenAddress}"`
  );
  backend = backend.replace(
    /ARIANFT_ADDRESS\s*=\s*".*"/,
    `ARIANFT_ADDRESS = "${ariaNFTAddress}"`
  );
  backend = backend.replace(
    /ARIAMARKETPLACE_ADDRESS\s*=\s*".*"/,
    `ARIAMARKETPLACE_ADDRESS = "${ariaMarketplaceAddress}"`
  );
  backend = backend.replace(
    /FRACTIONALNFT_ADDRESS\s*=\s*".*"/,
    `FRACTIONALNFT_ADDRESS = "${fractionalAddress}"`
  );

  fs.writeFileSync(backendPath, backend);
  console.log("✅ Backend contract_info.py updated\n");

  // ========== Update Frontend ==========
  console.log("📝 Updating frontend/src/constants.js...");
  const frontendPath = path.join(__dirname, "../../frontend/src/constants.js");
  let constants = fs.readFileSync(frontendPath, "utf8");

  constants = constants.replace(
    /export const ARIA_TOKEN_ADDRESS\s*=\s*".*"/,
    `export const ARIA_TOKEN_ADDRESS = "${ariaTokenAddress}"`
  );
  constants = constants.replace(
    /export const ARIA_NFT_ADDRESS\s*=\s*".*"/,
    `export const ARIA_NFT_ADDRESS = "${ariaNFTAddress}"`
  );
  constants = constants.replace(
    /export const MARKETPLACE_ADDRESS\s*=\s*".*"/,
    `export const MARKETPLACE_ADDRESS = "${ariaMarketplaceAddress}"`
  );
  constants = constants.replace(
    /export const FRACTIONAL_NFT_ADDRESS\s*=\s*".*"/,
    `export const FRACTIONAL_NFT_ADDRESS = "${fractionalAddress}"`
  );

  fs.writeFileSync(frontendPath, constants);
  console.log("✅ Frontend constants.js updated\n");

  console.log("🎉 All contracts deployed and files updated successfully!\n");
  console.log("📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`AriaToken:       ${ariaTokenAddress}`);
  console.log(`AriaNFT:         ${ariaNFTAddress}`);
  console.log(`AriaMarketplace: ${ariaMarketplaceAddress}`);
  console.log(`FractionalNFT:   ${fractionalAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("👉 Next Steps:");
  console.log("1️⃣ Restart backend: cd backend && python app.py");
  console.log("2️⃣ Restart frontend: cd frontend && npm run dev\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
