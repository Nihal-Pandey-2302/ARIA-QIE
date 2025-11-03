# backend/qiedex_service.py
"""
QIEDEX Integration Service
Handles token creation and liquidity pool management
"""

import requests
import os
from dotenv import load_dotenv
from web3 import Web3
from contract_info import FRACTIONALNFT_ADDRESS, FRACTIONALNFT_ABI

load_dotenv()

class QIEDEXService:
    """Service for interacting with QIEDEX token creator and liquidity pools"""
    
    # QIEDEX API endpoints (based on documentation)
    QIEDEX_API_BASE = "https://dex.qie.digital/api"
    TOKEN_CREATOR_ENDPOINT = f"{QIEDEX_API_BASE}/token-creator"
    LIQUIDITY_POOL_ENDPOINT = f"{QIEDEX_API_BASE}/liquidity-pools"
    TOKEN_VERIFY_ENDPOINT = f"{QIEDEX_API_BASE}/token-verify"
    
    # Blockchain connection
    PROVIDER_URL = os.getenv("QIE_RPC_URL", "http://127.0.0.1:8545/")
    w3 = Web3(Web3.HTTPProvider(PROVIDER_URL))
    
    @classmethod
    def create_fraction_token_onchain(
        cls,
        nft_contract: str,
        nft_token_id: int,
        token_supply: int,
        token_name: str,
        token_symbol: str,
        private_key: str
    ) -> dict:
        """
        Create a fractional token on-chain using FractionalNFT contract
        
        Args:
            nft_contract: Address of NFT contract
            nft_token_id: Token ID to fractionalize
            token_supply: Total supply of fraction tokens
            token_name: Name for the fraction token
            token_symbol: Symbol for the fraction token
            private_key: User's private key for signing
            
        Returns:
            dict with txHash, fractionalId, tokenAddress
        """
        try:
            # Get account from private key
            account = cls.w3.eth.account.from_key(private_key)
            
            # Create contract instance
            fractional_contract = cls.w3.eth.contract(
                address=FRACTIONALNFT_ADDRESS,
                abi=FRACTIONALNFT_ABI
            )
            
            # Build transaction
            tx = fractional_contract.functions.fractionalizeNFT(
                nft_contract,
                nft_token_id,
                token_supply,
                token_name,
                token_symbol
            ).build_transaction({
                'from': account.address,
                'nonce': cls.w3.eth.get_transaction_count(account.address),
                'gas': 3000000,
                'gasPrice': cls.w3.eth.gas_price
            })
            
            # Sign and send transaction
            signed_tx = cls.w3.eth.account.sign_transaction(tx, private_key)
            tx_hash = cls.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            # Wait for transaction receipt
            tx_receipt = cls.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Parse logs to get fractionalId and tokenAddress
            fractional_id = None
            token_address = None
            
            for log in tx_receipt.logs:
                try:
                    parsed_log = fractional_contract.events.AssetFractionalized().process_log(log)
                    fractional_id = parsed_log['args']['fractionalId']
                    token_address = parsed_log['args']['fractionToken']
                    break
                except Exception:
                    continue
            
            return {
                "success": True,
                "txHash": tx_hash.hex(),
                "fractionalId": fractional_id,
                "tokenAddress": token_address,
                "tokenName": token_name,
                "tokenSymbol": token_symbol,
                "totalSupply": token_supply
            }
            
        except Exception as e:
            print(f"Error fractionalizing NFT: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @classmethod
    def register_token_with_qiedex(
        cls,
        token_address: str,
        token_name: str,
        token_symbol: str,
        total_supply: int,
        nft_reference: dict
    ) -> dict:
        """
        Register the created token with QIEDEX for visibility and trading
        
        Args:
            token_address: Address of the created token
            token_name: Token name
            token_symbol: Token symbol
            total_supply: Total supply
            nft_reference: Dict with nftContract, nftTokenId, fractionalId
            
        Returns:
            dict with registration status
        """
        try:
            # Prepare payload for QIEDEX API
            payload = {
                "tokenAddress": token_address,
                "name": token_name,
                "symbol": token_symbol,
                "totalSupply": total_supply,
                "tokenType": "QIE20",
                "metadata": {
                    "type": "FractionalNFT",
                    "nftContract": nft_reference.get("nftContract"),
                    "nftTokenId": nft_reference.get("nftTokenId"),
                    "fractionalId": nft_reference.get("fractionalId"),
                    "platform": "A.R.I.A."
                }
            }
            
            # Note: This endpoint may not exist yet in QIEDEX
            # For now, we'll return success and the token can be manually added to QIEDEX
            # Once QIEDEX API is available, uncomment below:
            
            # response = requests.post(
            #     cls.TOKEN_CREATOR_ENDPOINT,
            #     json=payload,
            #     headers={"Content-Type": "application/json"}
            # )
            
            # if response.status_code == 200:
            #     return {"success": True, "data": response.json()}
            # else:
            #     return {"success": False, "error": response.text}
            
            # For now, return mock success
            return {
                "success": True,
                "message": "Token created on-chain. Add to QIEDEX manually.",
                "qiedexUrl": f"https://dex.qie.digital/token/{token_address}"
            }
            
        except Exception as e:
            print(f"Error registering with QIEDEX: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @classmethod
    def create_liquidity_pool(
        cls,
        token_address: str,
        wqie_amount: float,
        token_amount: float,
        private_key: str
    ) -> dict:
        """
        Create a liquidity pool on QIEDEX (WQIE <-> Token)
        
        Args:
            token_address: Address of the fraction token
            wqie_amount: Amount of WQIE to add
            token_amount: Amount of tokens to add
            private_key: User's private key
            
        Returns:
            dict with pool creation status
        """
        try:
            # This would interact with QIEDEX router contract
            # For now, return instructions for manual pool creation
            
            return {
                "success": True,
                "message": "Create pool manually on QIEDEX",
                "instructions": [
                    f"1. Go to https://dex.qie.digital/pool/create",
                    f"2. Select WQIE and token {token_address}",
                    f"3. Add {wqie_amount} WQIE and {token_amount} tokens",
                    f"4. Approve and create pool"
                ],
                "poolUrl": f"https://dex.qie.digital/pool/{token_address}"
            }
            
        except Exception as e:
            print(f"Error creating liquidity pool: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @classmethod
    def get_fractional_asset_info(cls, fractional_id: int) -> dict:
        """
        Get information about a fractionalized asset
        
        Args:
            fractional_id: ID of the fractionalized asset
            
        Returns:
            dict with asset info
        """
        try:
            fractional_contract = cls.w3.eth.contract(
                address=FRACTIONALNFT_ADDRESS,
                abi=FRACTIONALNFT_ABI
            )
            
            asset = fractional_contract.functions.getFractionalAsset(fractional_id).call()
            
            return {
                "fractionalId": fractional_id,
                "nftTokenId": asset[0],
                "nftContract": asset[1],
                "fractionToken": asset[2],
                "totalSupply": asset[3],
                "creator": asset[4],
                "isActive": asset[5],
                "createdAt": asset[6],
                "tokenName": asset[7],
                "tokenSymbol": asset[8]
            }
            
        except Exception as e:
            print(f"Error getting fractional asset info: {e}")
            return None