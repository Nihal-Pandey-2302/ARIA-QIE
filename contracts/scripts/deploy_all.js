const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting full deployment (including Oracle)...\n");

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
// ========== 3. Deploy AriaMarketplace ==========
console.log("🏪 Deploying AriaMarketplace...");
const AriaMarketplace = await hre.ethers.getContractFactory("AriaMarketplace");
const ariaMarketplace = await AriaMarketplace.deploy(
  ariaNFTAddress,
  ariaTokenAddress,
  18 // ✅ Pass token decimals
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

  // ========== 5. Deploy MockQIEOracle (NEW!) ==========
  console.log("🔮 Deploying MockQIEOracle...");
  let oracleAddress = "0x0000000000000000000000000000000000000000"; // Default
  
  try {
    const MockQIEOracle = await hre.ethers.getContractFactory("MockQIEOracle");
    const oracle = await MockQIEOracle.deploy();
    await oracle.waitForDeployment();
    oracleAddress = await oracle.getAddress();
    console.log(`✅ MockQIEOracle deployed to: ${oracleAddress}\n`);

    // Set oracle on marketplace
    console.log("🔗 Connecting oracle to marketplace...");
    const setOracleTx = await ariaMarketplace.setOracle(oracleAddress);
    await setOracleTx.wait();
    console.log("✅ Oracle connected to marketplace\n");

    // Set initial prices
    console.log("💰 Setting initial oracle prices...");
    const prices = [
      { pair: "ARIA/USD", price: 50000000 }, // $0.50
      { pair: "ETH/USD", price: 200000000000 }, // $2000
      { pair: "INR/USD", price: 1200000 }, // $0.012
      { pair: "RE_INDEX", price: 105000000 }, // 1.05x
    ];

    for (const { pair, price } of prices) {
      const tx = await oracle.updatePrice(pair, price);
      await tx.wait();
      console.log(`   ✅ ${pair}: ${price / 1e8}`);
    }
    console.log();
  } catch (err) {
    console.warn("⚠️ Oracle deployment skipped (contract may not exist yet)");
    console.log("   You can deploy oracle later with: npx hardhat run scripts/deploy-oracle.js\n");
  }

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
      MockQIEOracle: oracleAddress,
    },
  };

  const outputPath = path.join(__dirname, "../deployment-all.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("💾 Deployment info saved to deployment-all.json\n");

  // ========== Update Backend ==========
  console.log("📝 Updating backend/contract_info.py...");
  const backendPath = path.join(__dirname, "../../backend/contract_info.py");
  
  try {
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

    // Add or update ORACLE_ADDRESS
    if (!backend.includes("ORACLE_ADDRESS")) {
      backend = backend.replace(
        /FRACTIONALNFT_ADDRESS = ".*"/,
        `FRACTIONALNFT_ADDRESS = "${fractionalAddress}"\n\nORACLE_ADDRESS = "${oracleAddress}"`
      );
    } else {
      backend = backend.replace(
        /ORACLE_ADDRESS\s*=\s*".*"/,
        `ORACLE_ADDRESS = "${oracleAddress}"`
      );
    }

    fs.writeFileSync(backendPath, backend);
    console.log("✅ Backend contract_info.py updated\n");
  } catch (err) {
    console.warn("⚠️ Could not update backend/contract_info.py");
    console.log(`   Please add manually: ORACLE_ADDRESS = "${oracleAddress}"\n`);
  }

  // ========== Update Frontend ==========
  console.log("📝 Updating frontend/src/constants.js...");
  const frontendPath = path.join(__dirname, "../../aria-frontend/src/constants.js");
  
  try {
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

    // Add or update ORACLE_ADDRESS
    if (!constants.includes("ORACLE_ADDRESS")) {
      constants = constants.replace(
        /export const FRACTIONAL_NFT_ADDRESS = ".*"/,
        `export const FRACTIONAL_NFT_ADDRESS = "${fractionalAddress}";\nexport const ORACLE_ADDRESS = "${oracleAddress}";`
      );
    } else {
      constants = constants.replace(
        /export const ORACLE_ADDRESS\s*=\s*".*"/,
        `export const ORACLE_ADDRESS = "${oracleAddress}"`
      );
    }

    fs.writeFileSync(frontendPath, constants);
    console.log("✅ Frontend constants.js updated\n");
  } catch (err) {
    console.warn("⚠️ Could not update frontend/constants.js");
    console.log(`   Please add manually: export const ORACLE_ADDRESS = "${oracleAddress}";\n`);
  }

  console.log("🎉 All contracts deployed and files updated successfully!\n");
  console.log("📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`AriaToken:       ${ariaTokenAddress}`);
  console.log(`AriaNFT:         ${ariaNFTAddress}`);
  console.log(`AriaMarketplace: ${ariaMarketplaceAddress}`);
  console.log(`FractionalNFT:   ${fractionalAddress}`);
  console.log(`MockQIEOracle:   ${oracleAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("👉 Next Steps:");
  console.log("1️⃣ Restart backend: cd backend && python app.py");
  console.log("2️⃣ Restart frontend: cd aria-frontend && npm run dev");
  console.log("3️⃣ Test oracle: curl http://localhost:5001/oracle/status\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});