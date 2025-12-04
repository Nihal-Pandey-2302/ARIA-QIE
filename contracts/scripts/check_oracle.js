const { ethers } = require("ethers");

async function main() {
  const rpcUrl = "https://rpc1testnet.qie.digital";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // QIE Native Oracle Address from user input
  const address = "0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17";
  
  console.log(`Checking code at ${address} on QIE Testnet...`);
  
  try {
    const code = await provider.getCode(address);
    if (code === "0x") {
      console.log("❌ No code found at this address on Testnet. It might be a Mainnet address.");
    } else {
      console.log("✅ Code found! This address exists on Testnet.");
    }
  } catch (error) {
    console.error("Error fetching code:", error);
  }
}

main();
