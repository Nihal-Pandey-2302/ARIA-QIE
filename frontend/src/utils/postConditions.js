// src/utils/postConditions.js

import { NonFungibleConditionCode, PostConditionMode } from '@stacks/transactions';

/**
 * Build a Leather-compatible NFT post-condition
 *
 * @param {string} walletAddress - User's STX address
 * @param {string} nftContractAddress - NFT contract address
 * @param {string} nftContractName - NFT contract name
 * @param {string} assetName - NFT asset name
 * @param {number} tokenId - NFT token ID
 * @param {string} condition - 'DoesNotSend' or 'Sent' (default: 'DoesNotSend')
 * @returns {Object} Leather-compatible post-condition object
 */
export function buildNFTPostCondition(
  walletAddress,
  nftContractAddress,
  nftContractName,
  assetName,
  tokenId,
  condition = 'DoesNotSend'
) {
  const conditionCode =
    condition === 'DoesNotSend'
      ? NonFungibleConditionCode.DoesNotSend
      : NonFungibleConditionCode.Sends;

  return {
    principal: {
      address: walletAddress,
      id: 2, // standard principal
    },
    conditionCode,
    type: 2, // NFT post-condition
    assetInfo: {
      address: nftContractAddress,
      contractName: nftContractName,
      assetName: assetName,
    },
    value: tokenId,
    postConditionMode: PostConditionMode.Deny, // always deny by default
  };
}
