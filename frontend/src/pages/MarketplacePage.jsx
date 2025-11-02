import { useEffect, useState } from 'react';
import { 
  Box, Button, Heading, Text, VStack, Spinner, SimpleGrid, Image, Badge, HStack, useToast 
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { 
  MARKETPLACE_ADDRESS, MARKETPLACE_ABI, 
  ARIA_NFT_ADDRESS, ARIA_NFT_ABI, 
  ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, 
  TOKEN_DISPLAY, TOKEN_DECIMALS 
} from '../constants';

const MarketplacePage = ({ provider, account }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ariaBalance, setAriaBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(null); // Track which NFT is being purchased
  const toast = useToast();
  const navigate = useNavigate();

  // --- Fetch ARIA balance ---
  const fetchAriaBalance = async () => {
    if (!provider || !account) return;
    try {
      // Read-only contract with provider
      const ariaTokenContract = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, provider);
      const balance = await ariaTokenContract.balanceOf(account);
      setAriaBalance(Number(balance) / 10 ** TOKEN_DECIMALS);
      console.log("✅ ARIA Balance:", Number(balance) / 10 ** TOKEN_DECIMALS);
    } catch (err) {
      console.error("Failed to fetch ARIA balance:", err);
    }
  };

  // --- Fetch marketplace listings ---
  const fetchListings = async () => {
    if (!provider) return;
    setLoading(true);

    try {
      // Read-only contracts for listing fetch
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
      const nftContract = new ethers.Contract(ARIA_NFT_ADDRESS, ARIA_NFT_ABI, provider);

      let total = 20n;
      if (nftContract.tokenCounter) total = await nftContract.tokenCounter();
      else if (nftContract.getLastTokenId) total = await nftContract.getLastTokenId();

      const items = [];
      for (let i = 1n; i <= total; i++) {
        const listing = await marketplaceContract.listings(i);
        if (!listing || listing.seller === ethers.ZeroAddress || listing.price === 0n) continue;

        const price = Number(listing.price) / 10 ** TOKEN_DECIMALS;
        let metadata = {};
        try {
          const tokenURI = await nftContract.tokenURI(i);
          if (tokenURI.startsWith("http")) {
            const res = await fetch(tokenURI);
            if (res.ok) metadata = await res.json();
          }
        } catch (err) {
          console.warn(`⚠️ Failed to fetch metadata for token ${i}`, err);
        }

        items.push({ tokenId: Number(i), price, seller: listing.seller, metadata });
      }

      console.log("✅ Fetched listings:", items);
      setListings(items);
    } catch (err) {
      console.error("❌ Error fetching listings:", err);
      toast({
        title: "Failed to fetch listings",
        description: err.message || "See console for details",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Buy NFT using ARIA tokens ---
  const handleBuy = async (tokenId, price, seller) => {
    // Validate inputs
    if (!provider) {
      toast({
        title: "Provider not available",
        description: "Please ensure your wallet is connected",
        status: "error",
        duration: 3000,
      });
      return;
    }

    if (seller.toLowerCase() === account.toLowerCase()) {
      toast({
        title: "Cannot buy your own NFT",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    if (ariaBalance < price) {
      toast({
        title: "Insufficient ARIA balance",
        description: `You need ${price} ARIA but only have ${ariaBalance.toFixed(2)} ARIA`,
        status: "error",
        duration: 5000,
      });
      return;
    }

    setPurchasing(tokenId);

    try {
      // ✅ FIX: Properly await getSigner()
      const signer = await provider.getSigner();
      console.log("✅ Signer obtained:", await signer.getAddress());

      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      const ariaTokenContract = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, signer);

      const priceInWei = ethers.parseUnits(price.toString(), TOKEN_DECIMALS);
      console.log("💰 Price in wei:", priceInWei.toString());

      // Step 1: Approve marketplace to spend ARIA tokens
      toast({
        title: "Step 1/2: Approving ARIA tokens",
        status: "info",
        duration: null,
        isClosable: false,
      });

      const approveTx = await ariaTokenContract.approve(MARKETPLACE_ADDRESS, priceInWei);
      console.log("⏳ Approval tx sent:", approveTx.hash);
      await approveTx.wait();
      console.log("✅ Approval confirmed");

      toast.closeAll();

      // Step 2: Purchase NFT
      toast({
        title: "Step 2/2: Purchasing NFT",
        status: "info",
        duration: null,
        isClosable: false,
      });

      const tx = await marketplaceContract.purchaseAsset(tokenId);
      console.log("⏳ Purchase tx sent:", tx.hash);
      await tx.wait();
      console.log("✅ Purchase confirmed");

      toast.closeAll();
      toast({
        title: "Purchase Successful! 🎉",
        description: `You bought NFT #${tokenId} for ${price} ARIA`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Refresh data
      await fetchListings();
      await fetchAriaBalance();

    } catch (err) {
      console.error("❌ Purchase error:", err);
      toast.closeAll();
      
      let errorMsg = "Transaction failed. See console for details.";
      
      // Parse common errors
      if (err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (err.message?.includes("insufficient funds")) {
        errorMsg = "Insufficient funds for gas";
      } else if (err.reason) {
        errorMsg = err.reason;
      } else if (err.message) {
        errorMsg = err.message;
      }

      toast({
        title: "Purchase Failed",
        description: errorMsg,
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setPurchasing(null);
    }
  };

  // --- Navigate to Mint ARIA page ---
  const handleMintAriaButton = () => {
    navigate("/mint-aria");
  };

  useEffect(() => {
    fetchListings();
    fetchAriaBalance();
  }, [provider, account]);

  if (loading) {
    return (
      <VStack py={10}>
        <Spinner size="xl" />
        <Text>Loading marketplace...</Text>
      </VStack>
    );
  }

  return (
    <Box mt={2} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" bg="gray.800">
      <VStack spacing={4} mb={6}>
        <Heading as="h2" size="lg" textAlign="center">🎨 ARIA Marketplace</Heading>
        <Text fontSize="sm" color="gray.400" textAlign="center" maxW="2xl">
          Your ARIA Balance: <Text as="span" color={ariaBalance > 0 ? "green.400" : "red.400"} fontWeight="bold">
            {ariaBalance.toFixed(2)} {TOKEN_DISPLAY}
          </Text>
        </Text>
        <HStack spacing={3}>
          <Button onClick={handleMintAriaButton} colorScheme="orange" size="sm">
            Mint ARIA Tokens
          </Button>
          <Button onClick={fetchListings} colorScheme="blue" size="sm">
            Refresh Marketplace
          </Button>
        </HStack>
      </VStack>

      {listings.length === 0 ? (
        <VStack py={10}>
          <Text>No NFTs listed yet.</Text>
          <Text fontSize="sm" color="gray.400">List your NFT from the Mint page to see it here.</Text>
        </VStack>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {listings.map((listing) => {
            const isOwnNFT = listing.seller.toLowerCase() === account.toLowerCase();
            const canAfford = ariaBalance >= listing.price;
            const isPurchasing = purchasing === listing.tokenId;

            return (
              <Box key={listing.tokenId} p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="gray.700">
                <VStack spacing={3}>
                  <HStack justify="space-between" width="100%">
                    <Badge colorScheme="purple">#{listing.tokenId}</Badge>
                    <Badge colorScheme={isOwnNFT ? "yellow" : "green"}>
                      {isOwnNFT ? "Your NFT" : "For Sale"}
                    </Badge>
                  </HStack>

                  <Image
                    src={listing.metadata?.image || "https://i.postimg.cc/PJY2gmC0/LOGO.png"}
                    alt={listing.metadata?.name || "NFT"}
                    borderRadius="md"
                    boxSize="200px"
                    objectFit="cover"
                    fallbackSrc="https://i.postimg.cc/PJY2gmC0/LOGO.png"
                  />

                  <Heading size="md" noOfLines={1}>{listing.metadata?.name || `NFT #${listing.tokenId}`}</Heading>
                  <Text fontSize="sm" color="gray.400" noOfLines={2}>
                    {listing.metadata?.description || "AI-Verified Asset"}
                  </Text>

                  <Box bg="gray.800" p={3} borderRadius="md" width="100%">
                    <Text fontSize="xs" color="gray.400">Price</Text>
                    <Text fontWeight="bold" fontSize="lg" color="purple.300">
                      {listing.price} {TOKEN_DISPLAY}
                    </Text>
                  </Box>

                  {!isOwnNFT && (
                    <Button
                      colorScheme="teal"
                      size="sm"
                      width="100%"
                      onClick={() => handleBuy(listing.tokenId, listing.price, listing.seller)}
                      isDisabled={!canAfford || isPurchasing}
                      isLoading={isPurchasing}
                    >
                      {isPurchasing ? "Purchasing..." : canAfford ? "Buy Now" : "Insufficient Balance"}
                    </Button>
                  )}

                  {isOwnNFT && (
                    <Button
                      colorScheme="yellow"
                      size="sm"
                      width="100%"
                      isDisabled
                    >
                      Your Listing
                    </Button>
                  )}

                  {!canAfford && !isOwnNFT && (
                    <Button
                      colorScheme="orange"
                      size="xs"
                      width="100%"
                      onClick={handleMintAriaButton}
                    >
                      Mint ARIA to Buy
                    </Button>
                  )}

                  <Text fontSize="xs" color="gray.500">
                    Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                  </Text>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default MarketplacePage;