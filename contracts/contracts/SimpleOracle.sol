// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleOracle is Ownable {
    mapping(string => int256) public prices;
    mapping(string => uint256) public timestamps;

    event PriceUpdated(string pair, int256 price, uint256 timestamp);

    constructor() Ownable() {}

    function updatePrice(string memory pair, int256 price) external onlyOwner {
        prices[pair] = price;
        timestamps[pair] = block.timestamp;
        emit PriceUpdated(pair, price, block.timestamp);
    }

    function getLatestPrice(
        string memory pair
    ) external view returns (int256 price, uint256 timestamp) {
        price = prices[pair];
        timestamp = timestamps[pair];
        require(timestamp > 0, "Price not available");
    }
}
