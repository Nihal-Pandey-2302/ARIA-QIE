// src/components/NftCard.jsx - Updated to match marketplace structure

import { Box, Image, Text, Badge, VStack, Link, HStack, Heading } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

const MotionBox = motion(Box);

const NftCard = ({ listing, isOwned = false }) => {
  const { tokenId, name, metadata, ipfsLink, price, seller } = listing;

  return (
    <MotionBox
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      p={5}
      shadow="md"
      borderWidth="1px"
      borderRadius="md"
      bg="gray.700"
      cursor="pointer"
    >
      <VStack spacing={3} align="stretch">
        {/* Header with badges */}
        <HStack justify="space-between" width="100%">
          <Badge colorScheme="purple">#{tokenId}</Badge>
          <Badge colorScheme={isOwned ? "yellow" : "green"}>
            {isOwned ? "Your NFT" : "For Sale"}
          </Badge>
        </HStack>

        {/* Image */}
        <Image
          src={metadata?.image || "https://i.postimg.cc/PJY2gmC0/LOGO.png"}
          alt={name || `NFT #${tokenId}`}
          borderRadius="md"
          boxSize="200px"
          objectFit="cover"
          fallbackSrc="https://i.postimg.cc/PJY2gmC0/LOGO.png"
        />

        {/* Name */}
        <Heading size="md" noOfLines={1}>
          {name || `NFT #${tokenId}`}
        </Heading>

        {/* Description */}
        <Text fontSize="sm" color="gray.400" noOfLines={2}>
          {metadata?.description || "AI-Verified Asset"}
        </Text>

        {/* IPFS Link */}
        {ipfsLink && (
          <Link
            href={ipfsLink}
            isExternal
            color="cyan.300"
            fontSize="sm"
            fontWeight="medium"
            display="flex"
            alignItems="center"
            gap={1}
            _hover={{ color: "cyan.200", textDecoration: "underline" }}
            bg="gray.800"
            px={3}
            py={2}
            borderRadius="md"
            justifyContent="center"
          >
            <ExternalLink size={14} />
            View IPFS Metadata
          </Link>
        )}

        {/* Price (if provided) */}
        {price !== undefined && (
          <Box bg="gray.800" p={3} borderRadius="md" width="100%">
            <Text fontSize="xs" color="gray.400">Price</Text>
            <Text fontWeight="bold" fontSize="lg" color="purple.300">
              {price} ARIA
            </Text>
          </Box>
        )}

        {/* Seller (if provided) */}
        {seller && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Seller: {seller.slice(0, 6)}...{seller.slice(-4)}
          </Text>
        )}
      </VStack>
    </MotionBox>
  );
};

export default NftCard;