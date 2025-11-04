// src/components/NftActions.jsx
import { useState, useEffect } from 'react';
import {
  Box, Alert, AlertIcon, Link, Text, Button, VStack, Input,
  InputGroup, Heading, useToast, HStack, Badge, useDisclosure
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  MARKETPLACE_ADDRESS, MARKETPLACE_ABI,
  ARIA_NFT_ADDRESS, ARIA_NFT_ABI,
  TOKEN_DISPLAY, TOKEN_DECIMALS
} from '../constants';

import FractionalizeModal from './FractionalizeModal';

const NftActions = ({
  txId, tokenId, signer, ipfsLink,
  documentType, documentIcon, documentName
}) => {

  const [nftName, setNftName] = useState('');
  const [pricingMode, setPricingMode] = useState('USD'); // 'USD' | 'ARIA'
  const [usdPrice, setUsdPrice] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listingLoading, setListingLoading] = useState(false);

  const toast = useToast();

  const explorerLink = `https://your-qie-explorer.com/tx/${txId}`;

  const {
    isOpen: isFractionalizeOpen,
    onOpen: onFractionalizeOpen,
    onClose: onFractionalizeClose
  } = useDisclosure();

  useEffect(() => {
    if (documentIcon && documentName && tokenId) {
      setNftName(`${documentIcon} ${documentName} #${tokenId}`);
    } else if (tokenId) {
      setNftName(`RWA NFT #${tokenId}`);
    }
  }, [documentIcon, documentName, tokenId]);

  const handleList = async () => {
    if (!tokenId) return toast({ title: 'NFT not confirmed yet', status: 'warning' });
    if (!nftName?.trim()) return toast({ title: 'Please enter a name for your NFT', status: 'warning' });
    if (!signer) return toast({ title: "Signer not available", status: "error" });

    setListingLoading(true);
    try {
      const nft = new ethers.Contract(ARIA_NFT_ADDRESS, ARIA_NFT_ABI, signer);
      const mp = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // Ownership check
      let ownerAddr;
      try {
        ownerAddr = await nft.ownerOf(tokenId, { blockTag: 'latest' });
      } catch {
        ownerAddr = await signer.getAddress();
      }
      const me = await signer.getAddress();
      if (ownerAddr.toLowerCase() !== me.toLowerCase()) {
        throw new Error("You are not the owner of this NFT. Connect the correct wallet.");
      }

      // Approve NFT to marketplace
      const approved = await nft.getApproved(tokenId);
      if (approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        toast({ title: "Step 1/2: Approving Marketplace", status: "info", duration: null });
        const approveTx = await nft.approve(MARKETPLACE_ADDRESS, tokenId);
        await approveTx.wait();
        toast.closeAll();
        toast({ title: "Marketplace Approved!", status: "success", duration: 1500 });
      }

      // -------- LISTING MODE --------
      if (pricingMode === 'USD') {
        const usd = parseFloat(usdPrice || '0');
        if (!usd || usd <= 0) throw new Error("Invalid USD amount");

        const usdE8 = BigInt(Math.round(usd * 1e8));

        toast({ title: "Step 2/2: Listing NFT (USD-Pegged)", status: "info", duration: null });
        const tx = await mp.listAssetUsd(tokenId, usdE8, nftName.trim());
        await tx.wait();

        toast.closeAll();
        toast({
          title: "NFT Listed (USD-Pegged) 🎯",
          description: `Buyers will pay ARIA equivalent of $${usd.toFixed(2)} using oracle`,
          status: "success",
          duration: 4500
        });

      } else {
        const priceNum = parseFloat(listPrice || '0');
        if (!priceNum || priceNum <= 0) throw new Error("Invalid ARIA price");

        const priceWei = ethers.parseUnits(priceNum.toString(), TOKEN_DECIMALS);

        toast({ title: "Step 2/2: Listing NFT (Static ARIA)", status: "info", duration: null });
        const tx = await mp.listAssetAria(tokenId, priceWei, nftName.trim());
        await tx.wait();

        toast.closeAll();
        toast({
          title: `NFT Listed for ${priceNum} ${TOKEN_DISPLAY} 🟣`,
          status: "success",
          duration: 4500
        });
      }

    } catch (err) {
      console.error("Listing error:", err);
      toast.closeAll();
      toast({
        title: "Listing Error",
        description: err.reason || err.message,
        status: "error",
        duration: 6000
      });

    } finally {
      setListingLoading(false);
    }
  };

  return (
    <Box width="100%" mt={6}>
      {/* ✅ MINT SUCCESS BANNER */}
      <Alert status="success" borderRadius="md" w="100%" mb={4}>
        <AlertIcon />
        <Box flex="1">
          <Text fontWeight="bold">✅ Mint Transaction Confirmed!</Text>
          <Text fontSize="sm" mt={1}>NFT ID: #{tokenId}</Text>

          {documentType && (
            <HStack mt={2} spacing={2}>
              <Badge colorScheme="purple">{documentName || documentType}</Badge>
            </HStack>
          )}

          <HStack mt={2} spacing={3} fontSize="sm">
            <Link href={explorerLink} isExternal color="blue.300" display="flex" alignItems="center" gap={1}>
              View Transaction <ExternalLinkIcon />
            </Link>
            {ipfsLink && (
              <Link href={ipfsLink} isExternal color="green.300" display="flex" alignItems="center" gap={1}>
                View IPFS Metadata <ExternalLinkIcon />
              </Link>
            )}
          </HStack>
        </Box>
      </Alert>

      {tokenId && (
        <VStack spacing={6}>
          {/* ✅ NFT NAME INPUT */}
          <Box width="100%" p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="gray.750">
            <Heading as="h3" size="md" mb={4}>🏷️ Step 2: Set NFT Details</Heading>
            <Text fontSize="sm" mb={2} color="gray.400">NFT Display Name</Text>

            <InputGroup>
              <Input
                placeholder={`Enter NFT name (e.g. 'Property Deed #123')`}
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                bg="gray.800"
              />
            </InputGroup>

            <Text fontSize="xs" color="gray.500" mt={1}>
              This name will be shown on the marketplace & fractional tokens.
            </Text>
          </Box>

          {/* ✅ LISTING SECTION */}
          <Box width="100%" p={5} shadow="md" borderWidth="1px" borderRadius="md" bg="gray.750">
            <Heading as="h3" size="md" mb={4}>🛒 Option A: List on Marketplace</Heading>

            {/* Pricing Mode Switch */}
            <HStack spacing={3} mb={3}>
              <Badge colorScheme="purple" variant="outline">Pricing Model</Badge>
              <Button
                size="xs"
                variant={pricingMode === 'USD' ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => setPricingMode('USD')}
              >
                USD-Pegged (Oracle)
              </Button>
              <Button
                size="xs"
                variant={pricingMode === 'ARIA' ? 'solid' : 'outline'}
                colorScheme="purple"
                onClick={() => setPricingMode('ARIA')}
              >
                Static ARIA
              </Button>
            </HStack>

            <VStack spacing={4}>
              {pricingMode === 'USD' ? (
                <Box w="100%">
                  <Text fontSize="sm" mb={2} color="gray.400">Listing Price (USD)</Text>
                  <InputGroup>
                    <Input
                      placeholder="Enter price in USD (e.g. 100.00)"
                      value={usdPrice}
                      onChange={(e) => setUsdPrice(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      bg="gray.800"
                    />
                    <Text alignSelf="center" ml={2} color="gray.400" fontWeight="bold">$</Text>
                  </InputGroup>
                </Box>
              ) : (
                <Box w="100%">
                  <Text fontSize="sm" mb={2} color="gray.400">Listing Price ({TOKEN_DISPLAY})</Text>
                  <InputGroup>
                    <Input
                      placeholder={`Enter price in ${TOKEN_DISPLAY}`}
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      bg="gray.800"
                    />
                    <Text alignSelf="center" ml={2} color="gray.400" fontWeight="bold">{TOKEN_DISPLAY}</Text>
                  </InputGroup>
                </Box>
              )}

              <Button
                onClick={handleList}
                isLoading={listingLoading}
                isDisabled={(pricingMode === 'USD' ? !usdPrice : !listPrice) || !nftName}
                colorScheme="green"
                size="lg"
                w="100%"
              >
                {listingLoading
                  ? "Listing..."
                  : pricingMode === 'USD'
                    ? "List (USD-Pegged)"
                    : `List (${TOKEN_DISPLAY})`}
              </Button>
            </VStack>
          </Box>

          <Text fontWeight="bold" fontSize="lg">OR</Text>

          {/* ✅ FRACTIONALIZE SECTION */}
          <Box width="100%" p={5} shadow="md" borderWidth="1px" borderRadius="md" borderColor="purple.600" bg="gray.750">
            <Heading as="h3" size="md" mb={4}>🪙 Option B: Fractionalize</Heading>
            <Text fontSize="sm" color="gray.400" mb={4}>
              Turn this NFT into multiple tradeable tokens. Uses the name above as prefix.
            </Text>
            <Button
              onClick={onFractionalizeOpen}
              isDisabled={!nftName}
              colorScheme="purple"
              size="lg"
              w="100%"
            >
              Fractionalize NFT
            </Button>
            {!nftName && (
              <Text fontSize="xs" color="red.400" mt={2} textAlign="center">
                Please enter an NFT Display Name above to enable fractionalization.
              </Text>
            )}
          </Box>
        </VStack>
      )}

      {/* Modal */}
      <FractionalizeModal
        isOpen={isFractionalizeOpen}
        onClose={onFractionalizeClose}
        tokenId={tokenId}
        tokenName={nftName}
        signer={signer}
      />
    </Box>
  );
};

export default NftActions;
