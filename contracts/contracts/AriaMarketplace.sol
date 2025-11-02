// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AriaMarketplace is Ownable, ReentrancyGuard {
    // The NFT and Token contracts this marketplace interacts with
    IERC721 public immutable ariaNFT;
    IERC20 public immutable ariaToken;

    struct Listing {
        address seller;
        uint256 price;
    }

    // Mappings for marketplace and staking
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public stakedBalances;
    uint256 public totalStaked;

    event AssetListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event AssetUnlisted(uint256 indexed tokenId);
    event AssetPurchased(uint256 indexed tokenId, address indexed buyer, address seller, uint256 price);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _nftAddress, address _tokenAddress) Ownable() {
        ariaNFT = IERC721(_nftAddress);
        ariaToken = IERC20(_tokenAddress);
    }

    // --- MARKETPLACE FUNCTIONS ---

    function listAsset(uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be greater than zero");
        require(ariaNFT.ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(listings[tokenId].price == 0, "Asset is already listed");

        // Remove approval line

        listings[tokenId] = Listing(msg.sender, price);
        emit AssetListed(tokenId, msg.sender, price);
    }

    function unlistAsset(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender, "You are not the seller");
        delete listings[tokenId];
        emit AssetUnlisted(tokenId);
    }

    function purchaseAsset(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.price > 0, "Asset not listed for sale");
        require(listing.seller != msg.sender, "Cannot buy your own asset");

        ariaToken.transferFrom(msg.sender, listing.seller, listing.price);
        ariaNFT.transferFrom(listing.seller, msg.sender, tokenId);

        delete listings[tokenId];
        emit AssetPurchased(tokenId, msg.sender, listing.seller, listing.price);
    }

    // --- STAKING FUNCTIONS ---

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0 tokens");
        stakedBalances[msg.sender] += amount;
        totalStaked += amount;
        
        // Transfer tokens from the user to this contract for staking
        ariaToken.transferFrom(msg.sender, address(this), amount);
        emit TokensStaked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(stakedBalances[msg.sender] >= amount, "Insufficient staked balance");
        stakedBalances[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back to the user
        ariaToken.transfer(msg.sender, amount);
        emit TokensUnstaked(msg.sender, amount);
    }

    // Note: A mechanism to add rewards to this contract is needed.
    // For now, rewards can be funded by manually transferring AriaTokens to this contract.
    function claimRewards() external nonReentrant {
        uint256 rewards = getClaimableRewardsFor(msg.sender);
        require(rewards > 0, "No rewards to claim");

        // Simple reward distribution logic. Assumes rewards are AriaTokens.
        // A more robust system might use snapshots or reward-per-token-staked calculations.
        ariaToken.transfer(msg.sender, rewards);

        // A simple implementation might reset rewards upon claim, which is complex.
        // A better approach is to have a separate function to distribute rewards proportionally.
        // For the hackathon, this function can be a placeholder or simplified.
        emit RewardsClaimed(msg.sender, rewards);
    }

    // --- READ-ONLY FUNCTIONS ---

    function getClaimableRewardsFor(address user) public view returns (uint256) {
        if (totalStaked == 0) return 0;
        uint256 contractRewardPool = ariaToken.balanceOf(address(this)) - totalStaked;
        return (stakedBalances[user] * contractRewardPool) / totalStaked;
    }
}