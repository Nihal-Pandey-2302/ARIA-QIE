import { useEffect, useState } from 'react';
import {
  Box, Button, Heading, Text, VStack, Spinner, SimpleGrid, Image, Badge,
  HStack, useToast, Link, Input, InputGroup, InputLeftElement
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Search } from 'lucide-react';
import {
  MARKETPLACE_ADDRESS, MARKETPLACE_ABI,
  ARIA_NFT_ADDRESS, ARIA_NFT_ABI,
  ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI,
  TOKEN_DISPLAY, TOKEN_DECIMALS,
  BACKEND_URL
} from '../constants';
import LivePriceDisplay from '../components/LivePriceDisplay';

const E8 = 1e8;

const MarketplacePage = ({ provider, account }) => {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ariaBalance, setAriaBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const fetchAriaBalance = async () => {
    if (!provider || !account) return;
    try {
      const ariaToken = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, provider);
      const balance = await ariaToken.balanceOf(account);
      setAriaBalance(Number(ethers.formatUnits(balance, TOKEN_DECIMALS)));
    } catch (err) {
      console.error('Failed to fetch ARIA balance:', err);
    }
  };

  const fetchLiveBackend = async (tokenId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/oracle/nft-price/${tokenId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('live price fetch failed', e);
      return null;
    }
  };

  const fetchListings = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
      const nft = new ethers.Contract(ARIA_NFT_ADDRESS, ARIA_NFT_ABI, provider);

      let total = 20n;
      try {
        if (nft.tokenCounter) total = await nft.tokenCounter();
        else if (nft.getLastTokenId) total = await nft.getLastTokenId();
      } catch {
        // keep fallback 20
      }

      const items = [];
      for (let i = 1n; i <= total; i++) {
        let seller = ethers.ZeroAddress;
        let staticPriceWei = 0n;
        let currentPriceWei = 0n;
        let name = `NFT #${i}`;
        let useDynamic = false;
        let pair = 'ARIA/USD';
        let priceInUSD_E8 = 0n;
        let disputed = false;

        // 1. Pre-check if listed using the public mapping (does not revert)
        try {
          const basic = await marketplace.listings(i);
          // In Ethers v6, struct members are accessible by name if ABI has them
          const basicSeller = basic.seller || basic[0];
          if (!basicSeller || basicSeller === ethers.ZeroAddress) continue;
        } catch {
          // If this fails, likely network or ABI issue, skip
          continue;
        }

        // 2. Fetch full details (safe now because we know it's listed)
        try {
          const d = await marketplace.getListingDetails(i);
          seller = d[0];
          staticPriceWei = BigInt(d[1]);
          currentPriceWei = BigInt(d[2]);
          name = d[3];
          useDynamic = Boolean(d[4]);
          pair = d[5];
          priceInUSD_E8 = BigInt(d[6]);
          disputed = Boolean(d[7]);
        } catch (e) {
          console.warn(`getListingDetails failed for ${i} despite pre-check:`, e);
          continue;
        }

        if (!seller || seller === ethers.ZeroAddress) continue;
        if (staticPriceWei === 0n && currentPriceWei === 0n && !useDynamic) continue;

        let metadata = {};
        let ipfsLink = null;
        try {
          const tokenURI = await nft.tokenURI(i);
          let metadataUrl = tokenURI;
          if (tokenURI.startsWith('ipfs://')) {
            const ipfsHash = tokenURI.replace('ipfs://', '');
            metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          } else if (tokenURI.startsWith('Qm') || tokenURI.startsWith('bafy')) {
            metadataUrl = `https://gateway.pinata.cloud/ipfs/${tokenURI}`;
          }
          if (metadataUrl) {
            ipfsLink = metadataUrl;
            const res = await fetch(metadataUrl);
            if (res.ok) metadata = await res.json();
          }
        } catch (err) {
          console.warn(`metadata fetch failed for ${i}`, err);
        }

        // Compute friendly numbers
        const staticAria = Number(ethers.formatUnits(staticPriceWei, TOKEN_DECIMALS));
        const currentAria = Number(ethers.formatUnits(currentPriceWei, TOKEN_DECIMALS));
        const usdTarget = Number(priceInUSD_E8) / E8;

        // Pull backend live info (for USD-pegged baseline and multi-currency)
        const live = await fetchLiveBackend(Number(i));
        const liveAria = live?.currentPrice ?? (useDynamic ? currentAria : staticAria);
        // const displayUSD = useDynamic
        //   ? (usdTarget || live?.priceInUSD || 0)
        //   : (live?.priceInUSD || (staticAria * (live?.prices?.USD ?? 0) / (live?.prices?.ARIA ?? 1)) || 0);

        items.push({
          tokenId: Number(i),
          seller,
          name,
          mode: useDynamic ? 'USD_PEGGED' : 'STATIC_ARIA',
          staticAria,
          currentAria: liveAria,
          usdTarget,
          pair,
          metadata,
          ipfsLink,
          disputed,
        });
      }

      setListings(items);
      setFilteredListings(items);
    } catch (err) {
      console.error('Error fetching listings:', err);
      toast({
        title: 'Failed to fetch listings',
        description: err.message || 'See console for details',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (tokenId, priceAria, seller) => {
    if (!provider) {
      toast({ title: 'Provider not available', description: 'Connect your wallet', status: 'error', duration: 3000 });
      return;
    }
    if (seller.toLowerCase() === account.toLowerCase()) {
      toast({ title: 'Cannot buy your own NFT', status: 'warning', duration: 3000 });
      return;
    }
    if (ariaBalance < priceAria) {
      toast({
        title: 'Insufficient ARIA balance',
        description: `You need ${priceAria} ARIA but only have ${ariaBalance.toFixed(2)} ARIA`,
        status: 'error',
        duration: 5000
      });
      return;
    }

    setPurchasing(tokenId);
    try {
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      const ariaToken = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, signer);

      const priceInWei = ethers.parseUnits(priceAria.toString(), TOKEN_DECIMALS);

      toast({ title: 'Step 1/2: Approving ARIA tokens', status: 'info', duration: null, isClosable: false });
      const approveTx = await ariaToken.approve(MARKETPLACE_ADDRESS, priceInWei);
      await approveTx.wait();
      toast.closeAll();

      toast({ title: 'Step 2/2: Purchasing NFT', status: 'info', duration: null, isClosable: false });
      const tx = await marketplace.purchaseAsset(tokenId);
      await tx.wait();
      toast.closeAll();
      toast({
        title: 'Purchase Successful! 🎉',
        description: `You bought NFT #${tokenId} for ~${priceAria} ${TOKEN_DISPLAY}`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      await fetchListings();
      await fetchAriaBalance();
    } catch (err) {
      console.error('Purchase error:', err);
      toast.closeAll();
      toast({
        title: 'Purchase Failed',
        description: err.reason || err.message || 'Transaction failed',
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleMintAriaButton = () => navigate('/mint-aria');

  useEffect(() => {
    if (provider && account) {
      fetchListings();
      fetchAriaBalance();
    }
  }, [provider, account]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredListings(listings);
      return;
    }
    const q = searchQuery.toLowerCase();
    const f = listings.filter((l) => {
      const nameMatch = l.name?.toLowerCase().includes(q);
      const idMatch = l.tokenId.toString().includes(q);
      const priceMatch =
        l.mode === 'USD_PEGGED'
          ? l.usdTarget.toString().includes(q)
          : l.staticAria.toString().includes(q);
      const descMatch = l.metadata?.description?.toLowerCase().includes(q);
      return nameMatch || idMatch || priceMatch || descMatch;
    });
    setFilteredListings(f);
  }, [searchQuery, listings]);

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
          Your ARIA Balance:{' '}
          <Text as="span" color={ariaBalance > 0 ? 'green.400' : 'red.400'} fontWeight="bold">
            {ariaBalance.toFixed(2)} {TOKEN_DISPLAY}
          </Text>
        </Text>

        <HStack spacing={3} width="100%" maxW="2xl" justify="center">
          <Button onClick={handleMintAriaButton} colorScheme="orange" size="sm">Mint ARIA Tokens</Button>
          <Button onClick={fetchListings} colorScheme="blue" size="sm">Refresh Marketplace</Button>
        </HStack>

        <InputGroup maxW="2xl" size="md">
          <InputLeftElement pointerEvents="none">
            <Search size={18} color="gray" />
          </InputLeftElement>
          <Input
            placeholder="Search by name, token ID, ARIA/ USD price, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="gray.700"
            borderColor="gray.600"
            _hover={{ borderColor: 'gray.500' }}
            _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px #3182ce' }}
          />
        </InputGroup>

        {searchQuery && (
          <Text fontSize="sm" color="gray.400">
            Found {filteredListings.length} {filteredListings.length === 1 ? 'result' : 'results'}
          </Text>
        )}
      </VStack>

      {filteredListings.length === 0 ? (
        <VStack py={10}>
          <Text>{searchQuery ? 'No NFTs match your search.' : 'No NFTs listed yet.'}</Text>
          <Text fontSize="sm" color="gray.400">
            {searchQuery ? 'Try a different search term.' : 'List your NFT from the Mint page to see it here.'}
          </Text>
        </VStack>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filteredListings.map((l) => {
            const isOwnNFT = l.seller.toLowerCase() === account.toLowerCase();
            const effectiveAriaToPay = l.currentAria || l.staticAria || 0;
            const canAfford = ariaBalance >= effectiveAriaToPay;
            const isPurchasing = purchasing === l.tokenId;

            return (
              <Box key={l.tokenId} p={5} shadow="md" borderWidth={l.disputed ? "2px" : "1px"} borderColor={l.disputed ? "red.500" : "inherit"} borderRadius="md" bg="gray.700">
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between" width="100%">
                    <Badge colorScheme="purple">#{l.tokenId}</Badge>
                    <HStack>
                      {l.disputed && <Badge colorScheme="red">SUSPICIOUS</Badge>}
                      <Badge colorScheme={l.mode === 'USD_PEGGED' ? 'blue' : 'purple'}>
                        {l.mode === 'USD_PEGGED' ? 'USD-Pegged' : 'Static ARIA'}
                      </Badge>
                      <Badge colorScheme={isOwnNFT ? 'yellow' : 'green'}>
                        {isOwnNFT ? 'Your NFT' : 'For Sale'}
                      </Badge>
                    </HStack>
                  </HStack>

                  <Image
                    src={l.metadata?.image || 'https://i.postimg.cc/PJY2gmC0/LOGO.png'}
                    alt={l.name}
                    borderRadius="md"
                    boxSize="200px"
                    objectFit="cover"
                    fallbackSrc="https://i.postimg.cc/PJY2gmC0/LOGO.png"
                  />

                  <Heading size="md" noOfLines={1}>{l.name}</Heading>
                  <Text fontSize="sm" color="gray.400" noOfLines={2}>
                    {l.metadata?.description || 'AI-Verified Asset'}
                  </Text>

                  {l.ipfsLink ? (
                    <Link
                      href={l.ipfsLink}
                      isExternal
                      color="cyan.300"
                      fontSize="sm"
                      fontWeight="medium"
                      display="flex"
                      alignItems="center"
                      gap={1}
                      _hover={{ color: 'cyan.200', textDecoration: 'underline' }}
                      bg="gray.800"
                      px={3}
                      py={2}
                      borderRadius="md"
                      justifyContent="center"
                    >
                      <ExternalLink size={14} />
                      View IPFS Metadata
                    </Link>
                  ) : (
                    <Text fontSize="xs" color="gray.500" textAlign="center" fontStyle="italic">
                      IPFS metadata unavailable
                    </Text>
                  )}

                  {/* Pricing box */}
                  <Box bg="gray.800" p={3} borderRadius="md" width="100%">
                    {l.mode === 'USD_PEGGED' ? (
                      <>
                        <Text fontSize="xs" color="gray.400">Target Price</Text>
                        <Text fontWeight="bold" fontSize="lg" color="blue.300">
                          ${l.usdTarget?.toFixed(2)} USD <Text as="span" color="gray.400" fontSize="sm"> (paid in {TOKEN_DISPLAY})</Text>
                        </Text>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Live ARIA required updates via oracle at purchase.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text fontSize="xs" color="gray.400">List Price</Text>
                        <Text fontWeight="bold" fontSize="lg" color="purple.300">
                          {l.staticAria} {TOKEN_DISPLAY}
                        </Text>
                      </>
                    )}
                  </Box>

                  {/* Live price: baseline = current ARIA now (good for USD mode), or static ARIA for static mode */}
                  <LivePriceDisplay
                    tokenId={l.tokenId}
                    staticPrice={l.mode === 'USD_PEGGED' ? (l.currentAria || 0) : (l.staticAria || 0)}
                    showMultiCurrency={false}
                  />

                  {!isOwnNFT && (
                    <Button
                      colorScheme={l.disputed ? "red" : "teal"}
                      size="sm"
                      width="100%"
                      onClick={() => handleBuy(l.tokenId, effectiveAriaToPay, l.seller)}
                      isDisabled={!canAfford || isPurchasing || effectiveAriaToPay <= 0 || l.disputed}
                      isLoading={isPurchasing}
                    >
                      {l.disputed ? 'Suspicious Asset (Locked)' : (isPurchasing ? 'Purchasing...' : canAfford ? 'Buy Now' : 'Insufficient Balance')}
                    </Button>
                  )}

                  {isOwnNFT && (
                    <Button colorScheme="yellow" size="sm" width="100%" isDisabled>
                      Your Listing
                    </Button>
                  )}

                  {!canAfford && !isOwnNFT && !l.disputed && (
                    <Button colorScheme="orange" size="xs" width="100%" onClick={handleMintAriaButton}>
                      Mint ARIA to Buy
                    </Button>
                  )}

                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    Seller: {l.seller.slice(0, 6)}...{l.seller.slice(-4)}
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
