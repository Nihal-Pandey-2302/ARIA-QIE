// scripts/deploy_fractional.js
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying FractionalNFT Contract...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get balance (ethers v6 compatible)
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy FractionalNFT contract
const FractionalNFT = await hre.ethers.getContractFactory("FractionalNFT");
const fractionalNFT = await FractionalNFT.deploy();

// Wait for deployment
await fractionalNFT.waitForDeployment();

// Get deployed address
const fractionalAddress = await fractionalNFT.getAddress();

console.log("✅ FractionalNFT deployed to:", fractionalAddress);
console.log("\n📋 Deployment Summary:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Contract: FractionalNFT");
console.log("Address:", fractionalAddress);
console.log("Deployer:", deployer.address);
console.log("Network:", hre.network.name);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");


  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    fractionalNFT: fractionalNFT.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    './deployment-fractional.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-fractional.json\n");

  // Update contract_info.py
  console.log("📝 Updating backend/contract_info.py...");
  
  const contractInfoPath = '../backend/contract_info.py';
  let contractInfo = fs.readFileSync(contractInfoPath, 'utf8');
  
  // Add FractionalNFT address
  if (!contractInfo.includes('FRACTIONALNFT_ADDRESS')) {
    const addressLine = `\nFRACTIONALNFT_ADDRESS = "${fractionalNFT.address}"\n`;
    const insertAfter = 'ARIAMARKETPLACE_ADDRESS = ';
    const pos = contractInfo.indexOf(insertAfter);
    if (pos !== -1) {
      const endOfLine = contractInfo.indexOf('\n', pos) + 1;
      contractInfo = contractInfo.slice(0, endOfLine) + addressLine + contractInfo.slice(endOfLine);
    }
  }
  
  // Add ABI loading
  if (!contractInfo.includes('FRACTIONALNFT_ABI')) {
    const abiLoad = `FRACTIONALNFT_ABI = load_abi('FractionalNFT.sol/FractionalNFT.json')\n`;
    contractInfo += abiLoad;
  }
  
  fs.writeFileSync(contractInfoPath, contractInfo);
  console.log("✅ Backend contract_info.py updated\n");

  // Update frontend constants
  console.log("📝 Updating frontend/src/constants.js...");
  
  const constantsPath = '../frontend/src/constants.js';
  let constants = fs.readFileSync(constantsPath, 'utf8');
  
  if (!constants.includes('FRACTIONAL_NFT_ADDRESS')) {
    const addressLine = `\nexport const FRACTIONAL_NFT_ADDRESS = "${fractionalNFT.address}";\n`;
    const insertAfter = 'export const MARKETPLACE_ADDRESS';
    const pos = constants.indexOf(insertAfter);
    if (pos !== -1) {
      const endOfLine = constants.indexOf('\n', pos) + 1;
      constants = constants.slice(0, endOfLine) + addressLine + constants.slice(endOfLine);
    }
  }
  
  // Add ABI import
  if (!constants.includes('FractionalArtifact')) {
    const importLine = `import FractionalArtifact from '../../contracts/artifacts/contracts/FractionalNFT.sol/FractionalNFT.json';\n`;
    constants = importLine + constants;
  }
  
  if (!constants.includes('FRACTIONAL_NFT_ABI')) {
    constants += `\nexport const FRACTIONAL_NFT_ABI = FractionalArtifact.abi;\n`;
  }
  
  fs.writeFileSync(constantsPath, constants);
  console.log("✅ Frontend constants.js updated\n");

  console.log("🎉 Deployment Complete!");
  console.log("\n📋 Next Steps:");
  console.log("1. Restart your backend: cd backend && python app.py");
  console.log("2. Restart your frontend: cd aria-frontend && npm run dev");
  console.log("3. Test fractionalization with an NFT!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });