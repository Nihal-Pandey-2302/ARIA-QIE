# backend/oracle_service.py
"""
QIE Oracle Integration Service
Handles oracle price feeds and updates for dynamic NFT pricing
"""

import time
from typing import Dict, Optional, Tuple

class OracleService:
    """Service for interacting with QIE Oracle network"""
    
    # Price cache to reduce API calls
    price_cache: Dict[str, Dict] = {}
    CACHE_TTL = 30  # seconds
    PROVIDER_URL = "https://mock.qie-oracle.local"
    # Mock prices (replace with real QIE oracle API in production)
    MOCK_PRICES = {
        "ARIA/USD": {"price": 0.50, "decimals": 8},
        "ETH/USD": {"price": 2000.00, "decimals": 8},
        "INR/USD": {"price": 0.012, "decimals": 8},
        "RE_INDEX": {"price": 1.05, "decimals": 8},  # Real estate index
    }
    
    @classmethod
    def get_price_from_api(cls, pair: str) -> Optional[Dict]:
        """
        Fetch price from QIE Oracle API
        
        Args:
            pair: Trading pair (e.g., "ARIA/USD", "ETH/USD")
            
        Returns:
            Dict with price, timestamp, or None if failed
        """
        try:
            # Check cache first
            if pair in cls.price_cache:
                cached = cls.price_cache[pair]
                if time.time() - cached['fetched_at'] < cls.CACHE_TTL:
                    return cached
            
            # Get mock price
            if pair not in cls.MOCK_PRICES:
                print(f"⚠️ Price pair {pair} not found in mock data")
                return None
            
            price_data = {
                "pair": pair,
                "price": cls.MOCK_PRICES[pair]["price"],
                "decimals": cls.MOCK_PRICES[pair]["decimals"],
                "timestamp": int(time.time()),
                "fetched_at": time.time()
            }
            
            # Cache the result
            cls.price_cache[pair] = price_data
            
            return price_data
            
        except Exception as e:
            print(f"❌ Error fetching oracle price for {pair}: {e}")
            return None
    
    @classmethod
    def get_price_scaled(cls, pair: str) -> Tuple[Optional[int], Optional[int]]:
        """
        Get oracle price scaled for blockchain (8 decimals)
        
        Args:
            pair: Trading pair
            
        Returns:
            (scaled_price, timestamp) or (None, None)
        """
        data = cls.get_price_from_api(pair)
        if not data:
            return None, None
        
        # Scale to 8 decimals for blockchain
        scaled_price = int(data['price'] * (10 ** 8))
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
                from_data = cls.get_price_from_api(f"{from_currency}/USD")
                if not from_data:
                    return None
                return amount * from_data["price"]
            
            # If converting FROM USD directly
            if from_currency == "USD":
                to_data = cls.get_price_from_api(f"{to_currency}/USD")
                if not to_data:
                    return None
                return amount / to_data["price"]
            
            # Normal case: via USD intermediary
            from_data = cls.get_price_from_api(f"{from_currency}/USD")
            to_data = cls.get_price_from_api(f"{to_currency}/USD")
            
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
            aria_usd_data = cls.get_price_from_api("ARIA/USD")
            if not aria_usd_data:
                return {"ARIA": aria_price}
            
            usd_price = aria_price * aria_usd_data['price']
            
            # Convert to other currencies
            prices = {
                "ARIA": aria_price,
                "USD": usd_price,
            }
            
            # Add INR if available
            inr_usd_data = cls.get_price_from_api("INR/USD")
            if inr_usd_data:
                prices["INR"] = usd_price / inr_usd_data['price']
            
            # Add ETH if available
            eth_usd_data = cls.get_price_from_api("ETH/USD")
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
            re_index_data = cls.get_price_from_api("RE_INDEX")
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
            data = cls.get_price_from_api(pair)
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