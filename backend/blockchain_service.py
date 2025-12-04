# backend/blockchain_service.py
import os
from web3 import Web3
from dotenv import load_dotenv
from contract_info import ARIANFT_ADDRESS, ARIANFT_ABI

load_dotenv()

class BlockchainService:
    # --- CONFIGURATION ---
    PROVIDER_URL = os.getenv("QIE_RPC_URL", "https://rpc1testnet.qie.digital")
    
    # Load the server's wallet private key from .env
    # This is the first account provided by the `npx hardhat node` command
    SERVER_PRIVATE_KEY = os.getenv("SERVER_WALLET_PRIVATE_KEY")
    
    # --- INITIALIZATION ---
    w3 = Web3(Web3.HTTPProvider(PROVIDER_URL))
    server_account = w3.eth.account.from_key(SERVER_PRIVATE_KEY)
    
    # Instantiate the NFT contract object
    nft_contract = w3.eth.contract(address=ARIANFT_ADDRESS, abi=ARIANFT_ABI)

    @classmethod
    def mint_nft(cls, recipient_address: str, ipfs_hash: str) -> str:
        """
        Mints a new AriaNFT and returns the transaction hash.
        """
        try:
            print(f"[Blockchain Service] Minting NFT for {recipient_address} with IPFS hash {ipfs_hash}")

            # 1. Build the transaction
            tx_data = cls.nft_contract.functions.safeMint(
                recipient_address,
                ipfs_hash
            ).build_transaction({
                'from': cls.server_account.address,
                'nonce': cls.w3.eth.get_transaction_count(cls.server_account.address),
                'gas': 2000000, # You can adjust gas settings as needed
                'gasPrice': cls.w3.eth.gas_price
            })

            # 2. Sign the transaction with the server's private key
            signed_tx = cls.w3.eth.account.sign_transaction(tx_data, private_key=cls.SERVER_PRIVATE_KEY)

            # 3. Send the raw transaction to the blockchain
            tx_hash = cls.w3.eth.send_raw_transaction(signed_tx.raw_transaction)

            # 4. Wait for the transaction to be mined and get the receipt
            tx_receipt = cls.w3.eth.wait_for_transaction_receipt(tx_hash)

            print(f"[Blockchain Service] Minting successful. Tx Hash: {tx_receipt.transactionHash.hex()}")
            
            return tx_receipt.transactionHash.hex()

        except Exception as e:
            print(f"[Blockchain Service] Error minting NFT: {e}")
            raise e