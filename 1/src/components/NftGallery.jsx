// src/components/NftGallery.jsx

import { Box, Heading, SimpleGrid, Text } from '@chakra-ui/react';
import NftCard from './NftCard';

const NftGallery = ({ nfts }) => {
  if (nfts.length === 0) {
    return null; // Don't render anything if there are no NFTs yet
  }

  return (
    <Box mt={12} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" bg="gray.900">
      <Heading as="h2" size="lg" mb={6} textAlign="center">
        My Session's RWAs
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {nfts.map((nft) => (
          <NftCard key={nft.transaction_payload.verify_and_mint.token_id} nftData={nft} />
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default NftGallery;