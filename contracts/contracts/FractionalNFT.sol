// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title FractionalNFT
 * @dev Enables fractionalization of RWA NFTs into QIE20-compliant tokens
 * Integrates with QIEDEX for instant liquidity
 */
contract FractionalNFT is ReentrancyGuard, Ownable {
    
    // Struct to store fractionalization details
    struct FractionalAsset {
        uint256 nftTokenId;           // Original NFT token ID
        address nftContract;          // NFT contract address
        address fractionToken;        // Created QIE20 token address
        uint256 totalSupply;          // Total supply of fraction tokens
        address creator;              // Who fractionalized the NFT
        bool isActive;                // Is the fractionalization active
        uint256 createdAt;            // Timestamp
        string tokenName;             // Fraction token name
        string tokenSymbol;           // Fraction token symbol
    }
    
    // Mapping: fractionalId => FractionalAsset details
    mapping(uint256 => FractionalAsset) public fractionalizedAssets;
    
    // Mapping: NFT contract => tokenId => fractionalId
    mapping(address => mapping(uint256 => uint256)) public nftToFractionalId;
    
    // Counter for fractional IDs
    uint256 public fractionalizedCount;
    
    // Events
    event AssetFractionalized(
        uint256 indexed fractionalId,
        uint256 indexed nftTokenId,
        address indexed nftContract,
        address fractionToken,
        uint256 totalSupply,
        address creator
    );
    
    event AssetRedeemed(
        uint256 indexed fractionalId,
        address indexed redeemer,
        uint256 nftTokenId
    );
    
    event TokensBurned(
        uint256 indexed fractionalId,
        address indexed burner,
        uint256 amount
    );

    constructor() Ownable() {}
    
    /**
     * @dev Fractionalize an NFT into QIE20 tokens
     * @param nftContract Address of the NFT contract
     * @param nftTokenId Token ID to fractionalize
     * @param tokenSupply Total supply of fraction tokens to create
     * @param tokenName Name for the fraction token
     * @param tokenSymbol Symbol for the fraction token
     * @return fractionalId The ID of this fractionalization
     */
    function fractionalizeNFT(
        address nftContract,
        uint256 nftTokenId,
        uint256 tokenSupply,
        string memory tokenName,
        string memory tokenSymbol
    ) external nonReentrant returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(tokenSupply > 0, "Supply must be > 0");
        require(bytes(tokenName).length > 0, "Token name required");
        require(bytes(tokenSymbol).length > 0, "Token symbol required");
        
        // Verify caller owns the NFT
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(nftTokenId) == msg.sender, "Not NFT owner");
        
        // Check if already fractionalized
        require(
            nftToFractionalId[nftContract][nftTokenId] == 0,
            "NFT already fractionalized"
        );
        
        // Transfer NFT to this contract (escrow)
        nft.transferFrom(msg.sender, address(this), nftTokenId);
        
        // Create QIE20 token for fractions
        FractionToken fractionToken = new FractionToken(
            tokenName,
            tokenSymbol,
            tokenSupply,
            msg.sender  // Mint all tokens to creator
        );
        
        // Increment counter
        fractionalizedCount++;
        uint256 fractionalId = fractionalizedCount;
        
        // Store fractionalization data
        fractionalizedAssets[fractionalId] = FractionalAsset({
            nftTokenId: nftTokenId,
            nftContract: nftContract,
            fractionToken: address(fractionToken),
            totalSupply: tokenSupply,
            creator: msg.sender,
            isActive: true,
            createdAt: block.timestamp,
            tokenName: tokenName,
            tokenSymbol: tokenSymbol
        });
        
        // Map NFT to fractional ID
        nftToFractionalId[nftContract][nftTokenId] = fractionalId;
        
        emit AssetFractionalized(
            fractionalId,
            nftTokenId,
            nftContract,
            address(fractionToken),
            tokenSupply,
            msg.sender
        );
        
        return fractionalId;
    }
    
    /**
     * @dev Redeem NFT by burning all fraction tokens
     * @param fractionalId ID of the fractionalized asset
     */
    function redeemNFT(uint256 fractionalId) external nonReentrant {
        FractionalAsset storage asset = fractionalizedAssets[fractionalId];
        
        require(asset.isActive, "Asset not active");
        require(asset.fractionToken != address(0), "Invalid fraction token");
        
        FractionToken fractionToken = FractionToken(asset.fractionToken);
        
        // Verify caller owns ALL tokens
        uint256 balance = fractionToken.balanceOf(msg.sender);
        require(balance == asset.totalSupply, "Must own all tokens");
        
        // Burn all fraction tokens
        fractionToken.burnFrom(msg.sender, asset.totalSupply);
        
        // Mark as inactive
        asset.isActive = false;
        
        // Transfer NFT back to redeemer
        IERC721 nft = IERC721(asset.nftContract);
        nft.transferFrom(address(this), msg.sender, asset.nftTokenId);
        
        emit AssetRedeemed(fractionalId, msg.sender, asset.nftTokenId);
    }
    
    /**
     * @dev Get fractionalization details
     * @param fractionalId ID of the fractionalized asset
     */
    function getFractionalAsset(uint256 fractionalId) 
        external 
        view 
        returns (FractionalAsset memory) 
    {
        return fractionalizedAssets[fractionalId];
    }
    
    /**
     * @dev Check if an NFT is fractionalized
     * @param nftContract NFT contract address
     * @param nftTokenId Token ID
     */
    function isFractionalized(address nftContract, uint256 nftTokenId) 
        external 
        view 
        returns (bool) 
    {
        uint256 fractionalId = nftToFractionalId[nftContract][nftTokenId];
        if (fractionalId == 0) return false;
        return fractionalizedAssets[fractionalId].isActive;
    }
    
    /**
     * @dev Get fraction token address for an NFT
     * @param nftContract NFT contract address
     * @param nftTokenId Token ID
     */
    function getFractionTokenAddress(address nftContract, uint256 nftTokenId) 
        external 
        view 
        returns (address) 
    {
        uint256 fractionalId = nftToFractionalId[nftContract][nftTokenId];
        require(fractionalId > 0, "NFT not fractionalized");
        return fractionalizedAssets[fractionalId].fractionToken;
    }
}

/**
 * @title FractionToken
 * @dev QIE20-compliant token representing fractional ownership
 */
contract FractionToken is ERC20 {
    address public immutable fractionalNFTContract;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address recipient
    ) ERC20(name, symbol) {
        fractionalNFTContract = msg.sender;
        _mint(recipient, totalSupply * 10**decimals());
    }
    
    /**
     * @dev Burn tokens (only callable by FractionalNFT contract)
     * @param account Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) external {
        require(
            msg.sender == fractionalNFTContract,
            "Only FractionalNFT can burn"
        );
        _burn(account, amount);
    }
}