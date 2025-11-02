// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AriaNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Mapping from token ID to the IPFS metadata hash
    mapping(uint256 => string) private _tokenURIs;

    constructor() ERC721("ARIA RWA", "ARWA") Ownable() {}

    // Mint function restricted to the contract owner (the backend server)
    function safeMint(address to, string memory ipfsHash) public onlyOwner returns (uint256) {
        _tokenIdCounter.increment();
        uint256 newItemId = _tokenIdCounter.current();
        _safeMint(to, newItemId);
        _setTokenURI(newItemId, ipfsHash);
        return newItemId;
    }

    // Sets the metadata URI for a given token
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        _tokenURIs[tokenId] = _tokenURI;
    }

    // Returns the metadata URI for a given token
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
        return _tokenURIs[tokenId];
    }
}