// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IQIEOracle
 * @dev Interface for QIE Oracle integration
 * Provides real-world data feeds for dynamic pricing
 */
interface IQIEOracle {
    /**
     * @dev Get the latest price for a given pair
     * @param pair The trading pair (e.g., "ARIA/USD", "ETH/USD")
     * @return price The latest price (scaled by 10^8 for precision)
     * @return timestamp When the price was last updated
     */
    function getLatestPrice(string memory pair) external view returns (
        int256 price,
        uint256 timestamp
    );
    
    /**
     * @dev Get historical price data
     * @param pair The trading pair
     * @param timestamp The timestamp to query
     * @return price The price at that timestamp
     */
    function getHistoricalPrice(string memory pair, uint256 timestamp) 
        external 
        view 
        returns (int256 price);
    
    /**
     * @dev Check if oracle data is fresh (updated within threshold)
     * @param pair The trading pair
     * @param maxAge Maximum age in seconds
     * @return bool True if data is fresh
     */
    function isFresh(string memory pair, uint256 maxAge) 
        external 
        view 
        returns (bool);
}

/**
 * @title MockQIEOracle
 * @dev Mock implementation for testing
 * In production, this would connect to QIE's real oracle network
 */
contract MockQIEOracle is IQIEOracle {
    struct PriceData {
        int256 price;
        uint256 timestamp;
    }
    
    // Mapping: pair => price data
    mapping(string => PriceData) private prices;
    
    // Owner for manual price updates in testing
    address public owner;
    
    constructor() {
        owner = msg.sender;
        
        // Initialize with mock prices
        _updatePrice("ARIA/USD", 50000000); // $0.50 (8 decimals)
        _updatePrice("ETH/USD", 200000000000); // $2000 (8 decimals)
        _updatePrice("INR/USD", 1200000); // $0.012 (8 decimals)
        _updatePrice("RE_INDEX", 105000000); // 1.05x multiplier (8 decimals)
    }
    
    function getLatestPrice(string memory pair) 
        external 
        view 
        override 
        returns (int256 price, uint256 timestamp) 
    {
        PriceData memory data = prices[pair];
        require(data.timestamp > 0, "Price not available");
        return (data.price, data.timestamp);
    }
    
    function getHistoricalPrice(string memory pair, uint256 timestamp) 
        external 
        view 
        override 
        returns (int256 price) 
    {
        // Simplified: return current price (in real oracle, query historical)
        return prices[pair].price;
    }
    
    function isFresh(string memory pair, uint256 maxAge) 
        external 
        view 
        override 
        returns (bool) 
    {
        PriceData memory data = prices[pair];
        return (block.timestamp - data.timestamp) <= maxAge;
    }
    
    // Admin function to update prices (for testing)
    function updatePrice(string memory pair, int256 price) external {
        require(msg.sender == owner, "Only owner");
        _updatePrice(pair, price);
    }
    
    function _updatePrice(string memory pair, int256 price) private {
        prices[pair] = PriceData({
            price: price,
            timestamp: block.timestamp
        });
    }
}