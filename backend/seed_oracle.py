
import os
import time
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Config
RPC_URL = os.getenv("QIE_RPC_URL", "https://rpc1testnet.qie.digital") # Testnet RPC
PRIVATE_KEY = os.getenv("SERVER_WALLET_PRIVATE_KEY")
ORACLE_ADDRESS = "0xf37F527E7b50A07Fa7fd49D595132a1f2fDC5f98" # SimpleOracle Address

# Minimal ABI for updatePrice
ABI = [
    {
        "inputs": [
            {"name": "pair", "type": "string"},
            {"name": "price", "type": "int256"}
        ],
        "name": "updatePrice",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

def seed_oracle():
    if not PRIVATE_KEY:
        print("❌ Error: SERVER_WALLET_PRIVATE_KEY not found in .env")
        return

    print(f"🔌 Connecting to RPC: {RPC_URL}")
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    if not w3.is_connected():
        print("❌ Failed to connect to RPC")
        return

    account = w3.eth.account.from_key(PRIVATE_KEY)
    print(f"👤 Using account: {account.address}")
    
    contract = w3.eth.contract(address=ORACLE_ADDRESS, abi=ABI)
    
    # Data to seed
    pair = "ARIA/USD"
    price = 50000000 # $0.50 with 8 decimals
    
    print(f"🔮 Updating Oracle for {pair} to {price}...")
    
    try:
        # Build transaction
        tx = contract.functions.updatePrice(pair, price).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"✅ Transaction sent! Hash: {tx_hash.hex()}")
        print("⏳ Waiting for confirmation...")
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            print(f"🎉 Oracle updated successfully! Block: {receipt.blockNumber}")
        else:
            print("❌ Transaction failed (reverted on-chain)")
            
    except Exception as e:
        print(f"❌ Error updating oracle: {e}")

if __name__ == "__main__":
    seed_oracle()
