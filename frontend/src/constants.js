// src/constants.js
import { ethers } from 'ethers';

// --- Hardhat Local Network Configuration ---
export const NETWORK_CONFIG = {
  chainId: '0x7A69', // 31337 in hex
  chainName: 'Hardhat Localhost',
  nativeCurrency: { name: 'ETH', decimals: 18, symbol: 'ETH' },
  rpcUrls: ['http://127.0.0.1:8545']
};

// --- Backend API URL ---
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001';

// --- Deployed Contract Addresses (from Hardhat deployment) ---
export const ARIA_NFT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const ARIA_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const MARKETPLACE_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

// --- Contract ABIs (imported from artifacts) ---
// Make sure the path is correct relative to your frontend directory
// --- Contract ABIs (imported from artifacts) ---
import NftArtifact from '../../contracts/artifacts/contracts/AriaNFT.sol/AriaNFT.json';
import TokenArtifact from '../../contracts/artifacts/contracts/AriaToken.sol/AriaToken.json';
import MarketplaceArtifact from '../../contracts/artifacts/contracts/AriaMarketplace.sol/AriaMarketplace.json';


export const ARIA_NFT_ABI = NftArtifact.abi;
export const ARIA_TOKEN_ABI = TokenArtifact.abi;
export const MARKETPLACE_ABI = MarketplaceArtifact.abi;

// --- Ethers.js Contract Interfaces ---
// These help with parsing event logs
export const ARIA_NFT_INTERFACE = new ethers.Interface(ARIA_NFT_ABI);

// --- Display Constants ---
export const TOKEN_DISPLAY = 'ARIA';
export const TOKEN_DECIMALS = 18; // Default for ERC20