// src/components/NftActions.jsx
import { useState } from 'react';
import { Box, Alert, AlertIcon, Link, Text, Button, VStack, Input, InputGroup, Heading, useToast } from '@chakra-ui/react';
import { ethers } from 'ethers';
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, ARIA_NFT_ADDRESS, ARIA_NFT_ABI, TOKEN_DISPLAY, TOKEN_DECIMALS } from '../constants';

const NftActions = ({ txId, address, tokenId, signer }) => {
  const [listPrice, setListPrice] = useState('');
  const [listingLoading, setListingLoading] = useState(false);
  const toast = useToast();

  const explorerLink = `https://your-qie-explorer.com/tx/${txId}`; // Replace with actual explorer URL

  const handleList = async () => {
    if (!tokenId) return toast({ title: 'NFT not confirmed yet', status: 'warning' });
    const priceNum = parseFloat(listPrice?.trim());
    if (!priceNum || priceNum <= 0) return toast({ title: 'Invalid Price', status: 'warning' });
    if (!signer) return toast({ title: "Signer not available", status: "error" });

    setListingLoading(true);

    try {
      // Create contract instances with the user's signer
      const nftContract = new ethers.Contract(ARIA_NFT_ADDRESS, ARIA_NFT_ABI, signer);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      
      // Convert price to the smallest unit (Wei for 18 decimals)
      const priceInWei = ethers.parseUnits(listPrice, TOKEN_DECIMALS);

      // --- Step 1: Approve the Marketplace to transfer the NFT ---
      toast({ title: "Step 1/2: Approving Marketplace", status: "info", duration: null });
      const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, tokenId);
      await approveTx.wait(); // Wait for the approval transaction to be mined
      toast.closeAll(); // Close the "approving" toast

      // --- Step 2: List the asset on the marketplace ---
      toast({ title: "Step 2/2: Listing NFT", status: "info", duration: null });
      const listTx = await marketplaceContract.listAsset(tokenId, priceInWei);
      await listTx.wait(); // Wait for the listing transaction
      toast.closeAll();
      
      toast({ title: 'NFT Listed Successfully!', description: `Token #${tokenId} is now for sale.`, status: 'success' });

    } catch (err) {
      console.error('Listing error:', err);
      toast.closeAll();
      toast({ title: 'Listing Error', description: err.reason || err.message, status: 'error' });
    } finally {
      setListingLoading(false);
    }
  };

  return (
    <Box width="100%" mt={6}>
      <Alert status="success" borderRadius="md" w="100%" mb={4}>
        <AlertIcon />
        <Box>
          <Text>Mint transaction confirmed! NFT ID: {tokenId}</Text>
          <Link href={explorerLink} isExternal color="blue.300" textDecoration="underline">
            View on Explorer (Local)
          </Link>
        </Box>
      </Alert>

      {tokenId && (
        <Box mt={8} p={5} shadow="sm" borderWidth="1px" borderRadius="md" borderColor="gray.700">
          <Heading as="h3" size="md" mb={4}>
            Step 2: List NFT #{tokenId} for Sale
          </Heading>
          <VStack spacing={4}>
            <InputGroup>
              <Input placeholder={`Enter price in ${TOKEN_DISPLAY}`} value={listPrice} onChange={(e) => setListPrice(e.target.value)} type="number" />
              <Text alignSelf="center" ml={2} color="gray.400">{TOKEN_DISPLAY}</Text>
            </InputGroup>
            <Button onClick={handleList} isLoading={listingLoading} isDisabled={!listPrice} colorScheme="green" size="lg" w="100%">
              List on Marketplace
            </Button>
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default NftActions;