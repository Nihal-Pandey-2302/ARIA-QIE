# backend/oracle_service.py
"""
QIE Oracle Integration Service
Handles oracle price feeds and updates for dynamic NFT pricing
"""

import time
from typing import Dict, Optional, Tuple
import os
from web3 import Web3

class OracleService:
    """Service for QIE Oracle (AggregatorV3 compatible)"""
    
    # Oracle config from environment
    ORACLE_ADDRESS = os.getenv("QIE_ORACLE_ADDRESS", "")
    PROVIDER_URL = os.getenv("QIE_RPC_URL", "https://rpc-main1.qiblockchain.online/")
    
    # Price cache
    price_cache: Dict[str, Dict] = {}
    CACHE_TTL = 30
    
    # Initialize Web3
    w3 = Web3(Web3.HTTPProvider(PROVIDER_URL))
    
    # ✅ SimpleOracle ABI (Custom Interface)
    ORACLE_ABI = [
        {
            "inputs": [{"name": "pair", "type": "string"}],
            "name": "getLatestPrice",
            "outputs": [
                {"name": "price", "type": "int256"},
                {"name": "timestamp", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    @classmethod
    def get_oracle_contract(cls):
        """Get oracle contract instance"""
        # Use address from contract_info if env var not set, or fallback
        if not cls.ORACLE_ADDRESS:
            from contract_info import ORACLE_ADDRESS
            cls.ORACLE_ADDRESS = ORACLE_ADDRESS

        if not cls.ORACLE_ADDRESS:
            print("⚠️ Oracle address not set")
            return None
        
        try:
            if not cls.w3.is_connected():
                print("❌ Failed to connect to QIE RPC")
                return None
            
            return cls.w3.eth.contract(
                address=Web3.to_checksum_address(cls.ORACLE_ADDRESS),
                abi=cls.ORACLE_ABI
            )
        except Exception as e:
            print(f"❌ Failed to connect to oracle: {e}")
            return None
    
    @classmethod
    def get_price_from_oracle(cls, pair: str = "ARIA/USD") -> Optional[Dict]:
        """
        Fetch price from QIE Oracle (SimpleOracle)
        Falls back to mock if unavailable
        """
        # Check cache
        if pair in cls.price_cache:
            cached = cls.price_cache[pair]
            if time.time() - cached['fetched_at'] < cls.CACHE_TTL:
                # print(f"📦 Cache hit for {pair}")
                return cached
        
        # Try real oracle (Only for ARIA/USD since we only deployed one)
        if pair == "ARIA/USD":
            oracle = cls.get_oracle_contract()
            if oracle:
                try:
                    print(f"🔮 Fetching {pair} from QIE Oracle...")
                    
                    # Call getLatestPrice(pair) - SimpleOracle function
                    (answer, updatedAt) = oracle.functions.getLatestPrice(pair).call()
                    
                    # SimpleOracle uses 8 decimals by default (from our deployment script)
                    decimals = 8
                    
                    # Convert to float
                    price_float = answer / (10 ** decimals)
                    
                    price_data = {
                        "pair": pair,
                        "price": price_float,
                        "decimals": decimals,
                        "timestamp": updatedAt,
                        "roundId": 0, # Not used in SimpleOracle
                        "fetched_at": time.time(),
                        "source": "QIE Oracle (Simple)"
                    }
                    
                    cls.price_cache[pair] = price_data
                    print(f"✅ Got {pair}: ${price_float}")
                    return price_data
                    
                except Exception as e:
                    print(f"⚠️ Oracle fetch failed: {e}")
                    print("   Falling back to mock prices...")
        
        return cls.get_mock_price(pair)
    
    @classmethod
    def get_mock_price(cls, pair: str) -> Optional[Dict]:
        """Fallback mock prices"""
        mock_prices = {
            "ARIA/USD": 0.50,     # Our Testnet Oracle Price
            "QIE/USD": 0.10,      # QIE Price
            "ETH/USD": 3193.79,   # Real ETH Price (Dec 2025)
            "BTC/USD": 91416.39,  # Real BTC Price (Dec 2025)
            "INR/USD": 0.0111,    # Real INR Rate (~90 INR/USD)
            "RE_INDEX": 1.05,
        }
        
        if pair not in mock_prices:
            return None
        
        price_data = {
            "pair": pair,
            "price": mock_prices[pair],
            "decimals": 8,
            "timestamp": int(time.time()),
            "fetched_at": time.time(),
            "source": "Mock Fallback"
        }
        
        cls.price_cache[pair] = price_data
        return price_data
    
    @classmethod
    def get_price_scaled(cls, pair: str) -> Tuple[Optional[int], Optional[int]]:
        """
        Get oracle price scaled for blockchain (8 decimals)
        
        Args:
            pair: Trading pair
            
        Returns:
            (scaled_price, timestamp) or (None, None)
        """
        data = cls.get_price_from_oracle(pair) # Changed to use new oracle method
        if not data:
            return None, None
        
        # Scale to 8 decimals for blockchain
        # Use the 'decimals' from the oracle data if available, otherwise default to 8
        target_decimals = 8
        current_decimals = data.get('decimals', target_decimals)
        
        # Adjust scaling if the oracle provides different decimals
        if current_decimals != target_decimals:
            # First, normalize to 1 unit, then scale to target_decimals
            price_normalized = data['price'] / (10 ** current_decimals)
            scaled_price = int(price_normalized * (10 ** target_decimals))
        else:
            scaled_price = int(data['price'] * (10 ** target_decimals))

        timestamp = data['timestamp']
        
        return scaled_price, timestamp
    
    @classmethod
    def convert_currency(cls, amount: float, from_currency: str, to_currency: str) -> Optional[float]:
        try:
            # If same currency, return same amount
            if from_currency == to_currency:
                return amount
            
            # If converting TO USD directly
            if to_currency == "USD":
                from_data = cls.get_price_from_oracle(f"{from_currency}/USD")
                if not from_data:
                    return None
                return amount * from_data["price"]
            
            # If converting FROM USD directly
            if from_currency == "USD":
                to_data = cls.get_price_from_oracle(f"{to_currency}/USD")
                if not to_data:
                    return None
                return amount / to_data["price"]
            
            # Normal case: via USD intermediary
            from_data = cls.get_price_from_oracle(f"{from_currency}/USD")
            to_data = cls.get_price_from_oracle(f"{to_currency}/USD")
            
            if not from_data or not to_data:
                return None
            
            return amount * (from_data["price"] / to_data["price"])
            
        except Exception as e:
            print(f"❌ Currency conversion error: {e}")
            return None

    
    @classmethod
    def get_nft_price_in_currencies(cls, aria_price: float) -> Dict[str, float]:
        """
        Get NFT price in multiple currencies
        """
        try:
            # Get ARIA/USD rate
            aria_usd_data = cls.get_price_from_oracle("ARIA/USD")
            if not aria_usd_data:
                return {"ARIA": aria_price}
            
            usd_price = aria_price * aria_usd_data['price']
            
            # Convert to other currencies
            prices = {
                "ARIA": aria_price,
                "USD": usd_price,
            }
            
            # Add INR if available
            inr_usd_data = cls.get_price_from_oracle("INR/USD")
            if inr_usd_data:
                prices["INR"] = usd_price / inr_usd_data['price']
            
            # Add ETH if available
            eth_usd_data = cls.get_price_from_oracle("ETH/USD")
            if eth_usd_data:
                prices["ETH"] = usd_price / eth_usd_data['price']
            
            return prices
            
        except Exception as e:
            print(f"❌ Multi-currency price error: {e}")
            return {"ARIA": aria_price}
    
    @classmethod
    def apply_real_estate_multiplier(cls, original_value: float) -> float:
        """
        Apply real estate market index to property values
        """
        try:
            re_index_data = cls.get_price_from_oracle("RE_INDEX")
            if not re_index_data:
                return original_value
            
            multiplier = re_index_data['price']
            updated_value = original_value * multiplier
            
            return updated_value
            
        except Exception as e:
            print(f"❌ Real estate multiplier error: {e}")
            return original_value
    
    @classmethod
    def get_live_prices_batch(cls, pairs: list) -> Dict[str, Dict]:
        """
        Fetch multiple prices in batch
        """
        results = {}
        for pair in pairs:
            data = cls.get_price_from_oracle(pair)
            if data:
                results[pair] = data
        
        return results
    
    @classmethod
    def clear_cache(cls):
        """Clear the price cache"""
        cls.price_cache = {}
        print("✅ Oracle price cache cleared")


# Test if running directly
if __name__ == "__main__":
    print("🔮 Testing Oracle Service\n")
    
    # Test ARIA price
    price, timestamp = OracleService.get_price_scaled("ARIA/USD")
    if price:
        print(f"ARIA/USD: ${price / 1e8}")
    
    # Test currency conversion
    usd = OracleService.convert_currency(1000, "INR", "USD")
    if usd:
        print(f"1000 INR = ${usd:.2f} USD")
    
    # Test NFT multi-currency
    prices = OracleService.get_nft_price_in_currencies(1000)
    print(f"\n1000 ARIA in multiple currencies:")
    for curr, amount in prices.items():
        print(f"  {amount:.2f} {curr}")