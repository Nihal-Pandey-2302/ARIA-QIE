import FractionalArtifact from '../../contracts/artifacts/contracts/FractionalNFT.sol/FractionalNFT.json';
// src/constants.js
import { ethers } from 'ethers';

// --- Hardhat Local Network Configuration ---
// --- QIE Testnet Configuration ---
export const NETWORK_CONFIG = {
  chainId: '0x7BF', // 1983 in hex
  chainName: 'QIE Testnet',
  nativeCurrency: { name: 'QIE', decimals: 18, symbol: 'QIE' },
  rpcUrls: ['https://rpc1testnet.qie.digital'],
  blockExplorerUrls: ['https://testnet.qie.digital/']
};

// --- Backend API URL ---
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001';

// --- Deployed Contract Addresses (QIE Testnet) ---
export const ARIA_NFT_ADDRESS = "0xA1396CAe4A1Bf6C7Bd2e322F916967905E8d85e4";
export const ARIA_TOKEN_ADDRESS = "0xaE2a6140DC27a73501eb3e26e656fA5Cfd8dec3e";
export const MARKETPLACE_ADDRESS = "0xD504D75D5ebfaBEfF8d35658e85bbc52CC66d880";
export const ARIA_MARKETPLACE_ADDRESS = MARKETPLACE_ADDRESS; // Alias for consistency

export const FRACTIONAL_NFT_ADDRESS = "0x3e2B64f8d927447C370CD6a84FAdf92f6B95C806";

// --- Contract ABIs (imported from artifacts) ---
// Make sure the path is correct relative to your frontend directory
// --- Contract ABIs (imported from artifacts) ---
import NftArtifact from '../../contracts/artifacts/contracts/AriaNFT.sol/AriaNFT.json';
import TokenArtifact from '../../contracts/artifacts/contracts/AriaToken.sol/AriaToken.json';
import MarketplaceArtifact from '../../contracts/artifacts/contracts/AriaMarketplace.sol/AriaMarketplace.json';


export const ARIA_NFT_ABI = NftArtifact.abi;
export const ARIA_TOKEN_ABI = TokenArtifact.abi;
export const MARKETPLACE_ABI = MarketplaceArtifact.abi;
export const ARIA_MARKETPLACE_ABI = MARKETPLACE_ABI; // Alias for consistency

// --- Ethers.js Contract Interfaces ---
// These help with parsing event logs
export const ARIA_NFT_INTERFACE = new ethers.Interface(ARIA_NFT_ABI);

// --- Display Constants ---
export const TOKEN_DISPLAY = 'ARIA';
export const TOKEN_DECIMALS = 18; // Default for ERC20
export const FRACTIONAL_NFT_ABI = FractionalArtifact.abi;
