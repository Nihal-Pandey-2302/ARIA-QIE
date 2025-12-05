import { ethers } from "ethers";

const RPC_URL = "https://rpc1testnet.qie.digital";
const MARKETPLACE_ADDRESS = "0xD504D75D5ebfaBEfF8d35658e85bbc52CC66d880";

const MARKETPLACE_ABI = [
  "function getListingDetails(uint256 tokenId) external view returns (address seller, uint256 staticPrice, uint256 currentPrice, string memory name, bool useDynamic, string memory pair, uint256 priceInUSD_E8, bool disputed)",
  "function listings(uint256) external view returns (address seller, uint256 ariaPrice, uint256 usdPriceE8, string memory name, uint8 mode)",
  "function oracle() external view returns (address)",
  "function pricePair() external view returns (string)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

  console.log("Checking Listing #1...");
  
  try {
    const basic = await marketplace.listings(1);
    console.log("Basic Listing:", basic);
  } catch (e) {
    console.error("Basic Listing Error:", e);
  }

  try {
    const oracleAddress = await marketplace.oracle();
    console.log("Oracle Address:", oracleAddress);
    
    const pricePair = await marketplace.pricePair();
    console.log("Price Pair:", pricePair);

    if (oracleAddress !== ethers.ZeroAddress) {
      const oracleAbi = ["function getLatestPrice(string memory pair) external view returns (int256 price, uint256 timestamp)"];
      const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);
      try {
        const price = await oracle.getLatestPrice(pricePair);
        console.log("Oracle Price for", pricePair, ":", price);
      } catch (e) {
        console.error("Oracle getLatestPrice Error:", e);
      }
    }
  } catch (e) {
    console.error("Marketplace Config Error:", e);
  }

  try {
    const details = await marketplace.getListingDetails(1);
    console.log("Listing Details:", details);
  } catch (e) {
    console.error("getListingDetails Error:", e);
  }
}

main();
