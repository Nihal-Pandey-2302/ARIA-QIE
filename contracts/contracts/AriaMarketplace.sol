// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title IQIEOracle
 * @dev Minimal interface to fetch ARIA/USD price scaled by 1e8
 */
interface IQIEOracle {
    function getLatestPrice(string memory pair)
        external
        view
        returns (int256 price, uint256 timestamp);
}

/**
 * @title AriaMarketplace (v2) — Hybrid Pricing
 * @notice Supports Static ARIA listings and USD-pegged listings (paid in ARIA via oracle)
 */
contract AriaMarketplace is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Immutable references ---
    IERC721 public immutable ariaNFT;
    IERC20  public immutable ariaToken;
    uint8   public immutable ariaTokenDecimals; // assume 18, but keep configurable

    // --- Oracle config ---
    IQIEOracle public oracle;          // external oracle
    bool public useOracle = true;      // feature flag (can disable if oracle is down)
    string public pricePair = "ARIA/USD"; // pair used in oracle

    // --- Pricing model ---
    enum PricingMode {
        STATIC_ARIA,  // seller sets fixed ARIA amount
        USD_PEGGED    // seller sets USD (1e8 scaling); ARIA computed at purchase
    }

    struct Listing {
        address seller;
        uint256 ariaPrice;     // for STATIC_ARIA: ARIA amount (wei)
        uint256 usdPriceE8;    // for USD_PEGGED: USD scaled by 1e8 (e.g., 100 USD => 100_00000000)
        string  name;
        PricingMode mode;
    }

    mapping(uint256 => Listing) public listings;
    
    // --- Governance / Dispute Resolution ---
    mapping(uint256 => bool) public isDisputed;

    // --- Staking: untouched (kept for back-compat with your UI) ---
    mapping(address => uint256) public stakedBalances;
    uint256 public totalStaked;

    // --- Events ---
    event AssetListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 ariaPrice,
        uint256 usdPriceE8,
        string name,
        PricingMode mode
    );
    event AssetUnlisted(uint256 indexed tokenId);
    event AssetPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 paidAria,
        PricingMode mode
    );
    event OracleUpdated(address oracle);
    event OracleStatusChanged(bool enabled);
    event PricePairUpdated(string pair);
    event AssetDisputed(uint256 indexed tokenId, address indexed by);

    constructor(
        address _nftAddress,
        address _tokenAddress,
        uint8 _ariaTokenDecimals
    ) Ownable() {
        require(_nftAddress != address(0) && _tokenAddress != address(0), "Zero addr");
        ariaNFT = IERC721(_nftAddress);
        ariaToken = IERC20(_tokenAddress);
        ariaTokenDecimals = _ariaTokenDecimals;
    }

    // ========= Owner controls (oracle) =========
    function setOracle(address _oracle) external onlyOwner {
        oracle = IQIEOracle(_oracle);
        emit OracleUpdated(_oracle);
    }

    function setUseOracle(bool _status) external onlyOwner {
        useOracle = _status;
        emit OracleStatusChanged(_status);
    }

    function setPricePair(string calldata _pair) external onlyOwner {
        pricePair = _pair;
        emit PricePairUpdated(_pair);
    }

    // ========= Listing =========

    /// @notice List with STATIC ARIA price (backward compatible)
    function listAssetAria(uint256 tokenId, uint256 ariaPrice, string calldata name) external nonReentrant {
        require(ariaPrice > 0, "Price=0");
        require(ariaNFT.ownerOf(tokenId) == msg.sender, "Not owner");
        require(listings[tokenId].seller == address(0), "Already listed");
        require(bytes(name).length > 0, "Name empty");

        listings[tokenId] = Listing({
            seller: msg.sender,
            ariaPrice: ariaPrice,
            usdPriceE8: 0,
            name: name,
            mode: PricingMode.STATIC_ARIA
        });

        emit AssetListed(tokenId, msg.sender, ariaPrice, 0, name, PricingMode.STATIC_ARIA);
    }

    /// @notice List with USD-pegged price; buyers pay ARIA computed via oracle
    /// @param usdPriceE8 USD amount scaled by 1e8 (e.g., $100 => 100_00000000)
    function listAssetUsd(uint256 tokenId, uint256 usdPriceE8, string calldata name) external nonReentrant {
        require(useOracle, "Oracle disabled");
        require(address(oracle) != address(0), "Oracle not set");
        require(usdPriceE8 > 0, "USD=0");
        require(ariaNFT.ownerOf(tokenId) == msg.sender, "Not owner");
        require(listings[tokenId].seller == address(0), "Already listed");
        require(bytes(name).length > 0, "Name empty");

        listings[tokenId] = Listing({
            seller: msg.sender,
            ariaPrice: 0,
            usdPriceE8: usdPriceE8,
            name: name,
            mode: PricingMode.USD_PEGGED
        });

        emit AssetListed(tokenId, msg.sender, 0, usdPriceE8, name, PricingMode.USD_PEGGED);
    }

    function unlistAsset(uint256 tokenId) external nonReentrant {
        Listing memory L = listings[tokenId];
        require(L.seller != address(0), "Not listed");
        require(L.seller == msg.sender, "Not seller");
        delete listings[tokenId];
        emit AssetUnlisted(tokenId);
    }
    
    // ========= Governance / Dispute =========
    
    /// @notice Flag an asset as disputed/suspicious
    /// @dev In a real DAO, this would require voting or staking. For hackathon, anyone can flag.
    function disputeAsset(uint256 tokenId) external {
        Listing memory L = listings[tokenId];
        require(L.seller != address(0), "Not listed");
        require(!isDisputed[tokenId], "Already disputed");
        
        isDisputed[tokenId] = true;
        emit AssetDisputed(tokenId, msg.sender);
    }

    // ========= Purchase =========

    /// @notice Purchase an asset, paying ARIA; if USD-pegged, ARIA amount is computed using oracle
    function purchaseAsset(uint256 tokenId) external nonReentrant {
        Listing memory L = listings[tokenId];
        require(L.seller != address(0), "Not listed");
        require(L.seller != msg.sender, "Cannot buy own");
        
        // Optional: Block purchase if disputed?
        // require(!isDisputed[tokenId], "Asset is under dispute");

        uint256 toPayAria = _currentPriceInAria(L);

        // Pull ARIA from buyer to seller
        ariaToken.safeTransferFrom(msg.sender, L.seller, toPayAria);

        // Transfer NFT to buyer
        ariaNFT.safeTransferFrom(L.seller, msg.sender, tokenId);

        // Clear listing
        delete listings[tokenId];
        // Clear dispute if any
        if (isDisputed[tokenId]) {
            delete isDisputed[tokenId];
        }

        emit AssetPurchased(tokenId, msg.sender, L.seller, toPayAria, L.mode);
    }

    // ========= Views / helpers =========

    /// @notice Convert USD (1e8) -> ARIA (token decimals) with oracle price
    function _usdE8ToAria(uint256 usdE8) internal view returns (uint256) {
        require(useOracle, "Oracle disabled");
        require(address(oracle) != address(0), "Oracle not set");
        (int256 priceE8, ) = oracle.getLatestPrice(pricePair); // ARIA/USD scaled 1e8
        require(priceE8 > 0, "Bad oracle");
        // ARIA amount = usdE8 / priceE8; rescale to ARIA decimals
        // usdE8 and priceE8 are both 1e8 scaled; ratio is unitless
        // We output with token decimals: multiply by 10^decimals
        uint256 decimalsFactor = 10 ** uint256(ariaTokenDecimals);
        // multiply first then divide to keep precision
        return (usdE8 * decimalsFactor) / uint256(priceE8);
    }

    /// @notice Current price in ARIA for a given listing (handles both modes)
    function _currentPriceInAria(Listing memory L) internal view returns (uint256) {
        if (L.mode == PricingMode.STATIC_ARIA) {
            return L.ariaPrice;
        } else {
            return _usdE8ToAria(L.usdPriceE8);
        }
    }

    /// @notice Public view for UIs
    function currentPriceInAria(uint256 tokenId) external view returns (uint256) {
        Listing memory L = listings[tokenId];
        require(L.seller != address(0), "Not listed");
        return _currentPriceInAria(L);
    }

    /// @notice UI helper: returns full details and precomputed current price
    /// Matches your backend expectation shape.
    function getListingDetails(uint256 tokenId)
        external
        view
        returns (
            address seller,
            uint256 staticPrice,     // STATIC_ARIA price (wei) or 0
            uint256 currentPrice,    // current price in ARIA (wei) (oracle-applied if USD mode)
            string memory name,
            bool useDynamic,         // true if USD-pegged
            string memory pair,      // price pair (e.g., "ARIA/USD")
            uint256 priceInUSD_E8,   // USD value (1e8)
            bool disputed            // Dispute status
        )
    {
        Listing memory L = listings[tokenId];
        require(L.seller != address(0), "Not listed");

        uint256 curr = _currentPriceInAria(L);
        uint256 usdE8;

        if (L.mode == PricingMode.STATIC_ARIA) {
            // compute USD from ARIA static using oracle if available (otherwise 0)
            if (useOracle && address(oracle) != address(0)) {
                (int256 priceE8, ) = oracle.getLatestPrice(pricePair); // ARIA/USD
                if (priceE8 > 0) {
                    // USD = ARIA * priceE8 / 10^decimals
                    uint256 decimalsFactor = 10 ** uint256(ariaTokenDecimals);
                    usdE8 = (L.ariaPrice * uint256(priceE8)) / decimalsFactor;
                }
            }
            return (L.seller, L.ariaPrice, curr, L.name, false, pricePair, usdE8, isDisputed[tokenId]);
        } else {
            // USD-pegged listing: usdPriceE8 is authoritative
            return (L.seller, 0, curr, L.name, true, pricePair, L.usdPriceE8, isDisputed[tokenId]);
        }
    }

    // ========= Staking (unchanged) =========

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount=0");
        stakedBalances[msg.sender] += amount;
        totalStaked += amount;
        ariaToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(stakedBalances[msg.sender] >= amount, "Insufficient");
        stakedBalances[msg.sender] -= amount;
        totalStaked -= amount;
        ariaToken.safeTransfer(msg.sender, amount);
    }

    function getClaimableRewardsFor(address user) public view returns (uint256) {
        if (totalStaked == 0) return 0;
        uint256 contractRewardPool = ariaToken.balanceOf(address(this)) - totalStaked;
        return (stakedBalances[user] * contractRewardPool) / totalStaked;
    }
}
