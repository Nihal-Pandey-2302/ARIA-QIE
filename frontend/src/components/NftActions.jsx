// src/components/NftActions.jsx - Enhanced with IPFS and Document Info
import { useState, useEffect } from 'react';
import { Box, Alert, AlertIcon, Link, Text, Button, VStack, Input, InputGroup, Heading, useToast, HStack, Badge } from '@chakra-ui/react';
import { ethers } from 'ethers';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, ARIA_NFT_ADDRESS, ARIA_NFT_ABI, TOKEN_DISPLAY, TOKEN_DECIMALS } from '../constants';

const NftActions = ({ txId, address, tokenId, signer, mintReceipt, ipfsLink, documentType, documentIcon, documentName }) => {
  const [listPrice, setListPrice] = useState('');
  const [nftName, setNftName] = useState('');
  const [listingLoading, setListingLoading] = useState(false);
  const toast = useToast();

  const explorerLink = `https://your-qie-explorer.com/tx/${txId}`; // Replace with actual explorer URL

  // ✅ Auto-generate a default name based on document info
  useEffect(() => {
    if (documentIcon && documentName && tokenId) {
      const defaultName = `${documentIcon} ${documentName} #${tokenId}`;
      setNftName(defaultName);
    } else if (tokenId) {
      setNftName(`RWA NFT #${tokenId}`);
    }
  }, [documentIcon, documentName, tokenId]);

  const handleList = async () => {
    if (!tokenId) return toast({ title: 'NFT not confirmed yet', status: 'warning' });

    const priceNum = parseFloat(listPrice?.trim());
    if (!priceNum || priceNum <= 0) return toast({ title: 'Invalid Price', status: 'warning' });
    
    if (!nftName || nftName.trim().length === 0) {
      return toast({ title: 'Please enter a name for your NFT', status: 'warning' });
    }

    if (!signer) return toast({ title: "Signer not available", status: "error" });

    setListingLoading(true);

    try {
      const nftContract = new ethers.Contract(ARIA_NFT_ADDRESS, ARIA_NFT_ABI, signer);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      const priceInWei = ethers.parseUnits(listPrice, TOKEN_DECIMALS);

      // Check ownership
      let tokenOwner;
      try {
        tokenOwner = await nftContract.ownerOf(tokenId, { blockTag: 'latest' });
      } catch (err) {
        console.warn("ownerOf failed, assuming signer owns NFT (local chain)", err);
        tokenOwner = await signer.getAddress();
      }

      const currentAddress = await signer.getAddress();
      if (tokenOwner.toLowerCase() !== currentAddress.toLowerCase()) {
        throw new Error("You are not the owner of this NFT. Connect the correct wallet.");
      }

      // Check approval
      const approvedAddress = await nftContract.getApproved(tokenId);
      if (approvedAddress.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        toast({ title: "Step 1/2: Approving Marketplace", status: "info", duration: null });
        const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, tokenId);
        await approveTx.wait();
        toast.closeAll();
        toast({ title: "Marketplace Approved!", status: "success", duration: 2000 });
      }

      // List NFT with name
      toast({ title: "Step 2/2: Listing NFT", status: "info", duration: null });
      const listTx = await marketplaceContract.listAsset(tokenId, priceInWei, nftName.trim());
      await listTx.wait();

      toast.closeAll();
      toast({
        title: "NFT Listed Successfully! 🎉",
        description: `"${nftName}" (Token #${tokenId}) is now for sale at ${listPrice} ${TOKEN_DISPLAY}`,
        status: "success",
        duration: 5000,
      });

    } catch (err) {
      console.error("Listing error:", err);
      toast.closeAll();
      toast({
        title: "Listing Error",
        description: err.reason || err.message,
        status: "error",
        duration: 6000,
      });
    } finally {
      setListingLoading(false);
    }
  };

  return (
    <Box width="100%" mt={6}>
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
        <Box mt={8} p={5} shadow="md" borderWidth="1px" borderRadius="md" borderColor="gray.600" bg="gray.750">
          <Heading as="h3" size="md" mb={4}>
            📋 Step 2: List NFT #{tokenId} on Marketplace
          </Heading>
          
          <VStack spacing={4}>
            {/* NFT Name Input with smart default */}
            <Box width="100%">
              <Text fontSize="sm" mb={2} color="gray.400">
                NFT Display Name
              </Text>
              <InputGroup>
                <Input
                  placeholder={`Enter NFT name (e.g., 'Property Deed #123')`}
                  value={nftName}
                  onChange={(e) => setNftName(e.target.value)}
                  type="text"
                  bg="gray.800"
                />
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                This name will be displayed on the marketplace
              </Text>
            </Box>

            {/* Price Input */}
            <Box width="100%">
              <Text fontSize="sm" mb={2} color="gray.400">
                Listing Price
              </Text>
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
                <Text alignSelf="center" ml={2} color="gray.400" fontWeight="bold">
                  {TOKEN_DISPLAY}
                </Text>
              </InputGroup>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Set your asking price in ARIA tokens
              </Text>
            </Box>

            <Button
              onClick={handleList}
              isLoading={listingLoading}
              isDisabled={!listPrice || !nftName}
              colorScheme="green"
              size="lg"
              w="100%"
              mt={2}
            >
              {listingLoading ? "Listing..." : "List on Marketplace"}
            </Button>

            {ipfsLink && (
              <Text fontSize="xs" color="gray.500" textAlign="center">
                💡 Your NFT metadata is stored on IPFS and will be visible to buyers
              </Text>
            )}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default NftActions;