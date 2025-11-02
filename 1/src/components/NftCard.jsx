// src/components/NftCard.jsx

import { Box, Image, Text, Badge, VStack, Link, AspectRatio, HStack } from '@chakra-ui/react'; // ✅ Add HStack here
import { motion } from 'framer-motion';

const NftCard = ({ nftData }) => {
  const { ai_report_display, ipfs_link, listed, mintedTokenId } = nftData;

  return (
    <motion.div whileHover={{ y: -5 }}>
      <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="gray.800" borderColor="gray.700">
        <AspectRatio ratio={16 / 9}>
          <Box bg="gray.700" display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="xl" color="gray.500" fontWeight="bold">RWA</Text>
          </Box>
        </AspectRatio>

        <VStack p={4} align="start" spacing={3}>
          <Text fontWeight="bold" fontSize="lg" noOfLines={1}>
            AI Verified RWA: #{mintedTokenId.slice(-6)}
          </Text>
          <Text fontSize="sm" color="gray.400">
            Value: {ai_report_display.total} {ai_report_display.currency}
          </Text>
          {/* ✅ This HStack will now render correctly */}
          <HStack>
            {listed ? (
              <Badge colorScheme="green">Listed</Badge>
            ) : (
              <Badge colorScheme="purple">Minted</Badge>
            )}
            <Link href={ipfs_link} isExternal fontSize="sm" color="blue.400">
              View on IPFS
            </Link>
          </HStack>
        </VStack>
      </Box>
    </motion.div>
  );
};

export default NftCard;