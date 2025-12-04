// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AriaToken is ERC20, Ownable {
    uint256 public rate = 100000; // 1 ETH = 100,000 ARIA
    constructor() ERC20("Aria", "ARIA") {
        _mint(msg.sender, 100_000_000 * 10 ** decimals());
    }

    // --- Mint ARIA from ETH ---
    function mintFromETH() external payable {
        require(msg.value > 0, "Send ETH to buy ARIA");
        uint256 amount = msg.value * rate;
        _mint(msg.sender, amount);
    }

    // Optional: Withdraw ETH collected in contract
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
