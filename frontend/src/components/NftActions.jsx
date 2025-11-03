// src/components/NftActions.jsx
import { useState, useEffect } from 'react';
import { 
  Box, Alert, AlertIcon, Link, Text, Button, VStack, Input, 
  InputGroup, Heading, useToast, HStack, Badge, useDisclosure // 1. ADD useDisclosure
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, ARIA_NFT_ADDRESS, ARIA_NFT_ABI, TOKEN_DISPLAY, TOKEN_DECIMALS } from '../constants';

// 2. ADD IMPORT for the modal
import FractionalizeModal from './FractionalizeModal'; 

const NftActions = ({ txId, address, tokenId, signer, mintReceipt, ipfsLink, documentType, documentIcon, documentName }) => {
  const [listPrice, setListPrice] = useState('');
  const [nftName, setNftName] = useState('');
  const [listingLoading, setListingLoading] = useState(false);
  const toast = useToast();

  const explorerLink = `https://your-qie-explorer.com/tx/${txId}`; // Replace with actual explorer URL

  // 3. ADD MODAL STATE for fractionalization
  const { 
    isOpen: isFractionalizeOpen, 
    onOpen: onFractionalizeOpen, 
    onClose: onFractionalizeClose 
  } = useDisclosure();

  useEffect(() => {
    if (documentIcon && documentName && tokenId) {
      const defaultName = `${documentIcon} ${documentName} #${tokenId}`;
      setNftName(defaultName);
    } else if (tokenId) {
      setNftName(`RWA NFT #${tokenId}`);
    }
  }, [documentIcon, documentName, tokenId]);

  const handleList = async () => {
    // ... (your existing handleList function - no changes needed)
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

      const approvedAddress = await nftContract.getApproved(tokenId);
      if (approvedAddress.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        toast({ title: "Step 1/2: Approving Marketplace", status: "info", duration: null });
        const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, tokenId);
        await approveTx.wait();
        toast.closeAll();
        toast({ title: "Marketplace Approved!", status: "success", duration: 2000 });
      }

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
        {/* ... (your existing Alert content - no changes) */}
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
          {/* Section 1: NFT Name (Shared by List and Fractionalize) */}
          <Box width="100%" p={5} shadow="md" borderWidth="1px" borderRadius="md" borderColor="gray.600" bg="gray.750">
            <Heading as="h3" size="md" mb={4}>
              🏷️ Step 2: Set NFT Details
            </Heading>
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
              This name will be used for the marketplace or for your fractional tokens.
            </Text>
          </Box>

          {/* Section 2: List on Marketplace */}
          <Box width="100%" p={5} shadow="md" borderWidth="1px" borderRadius="md" borderColor="gray.600" bg="gray.750">
            <Heading as="h3" size="md" mb={4}>
              🛒 Option A: List on Marketplace
            </Heading>
            <VStack spacing={4}>
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
              </Box>

              <Button
                onClick={handleList}
                isLoading={listingLoading}
                isDisabled={!listPrice || !nftName}
                colorScheme="green"
                size="lg"
                w="100%"
              >
                {listingLoading ? "Listing..." : "List on Marketplace"}
              </Button>
            </VStack>
          </Box>
          
          <Text fontWeight="bold" fontSize="lg">OR</Text>

          {/* 4. ADD FRACTIONALIZE BUTTON AND SECTION */}
          <Box width="100%" p={5} shadow="md" borderWidth="1px" borderRadius="md" borderColor="purple.600" bg="gray.750">
            <Heading as="h3" size="md" mb={4}>
              🪙 Option B: Fractionalize
            </Heading>
            <Text fontSize="sm" color="gray.400" mb={4}>
              Turn this NFT into many small, tradeable tokens. The name you set above will be used as a prefix.
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

      {/* 5. ADD THE MODAL COMPONENT (it's hidden until onFractionalizeOpen is called) */}
      <FractionalizeModal
        isOpen={isFractionalizeOpen}
        onClose={onFractionalizeClose}
        tokenId={tokenId}
        tokenName={nftName} // Pass the name from the input
        signer={signer}
      />

    </Box>
  );
};

export default NftActions;