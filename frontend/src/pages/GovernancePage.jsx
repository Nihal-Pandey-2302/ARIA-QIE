import { useState, useEffect } from 'react';
import { 
  Box, Container, Heading, Text, VStack, SimpleGrid, 
  Button, Badge, useToast, Spinner, HStack, Card, CardBody, 
  Image, Stack, Divider 
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { ARIA_MARKETPLACE_ADDRESS, ARIA_MARKETPLACE_ABI } from '../constants';

export default function GovernancePage({ signer }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchListings();
  }, [signer]);

  const fetchListings = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      const marketplace = new ethers.Contract(
        ARIA_MARKETPLACE_ADDRESS,
        ARIA_MARKETPLACE_ABI,
        signer
      );

      // In a real app, we'd have an event indexer or a 'getAllListings' function.
      // For hackathon, we'll iterate a reasonable range or rely on events.
      // Assuming IDs 1-20 for demo.
      const items = [];
      for (let i = 1; i <= 20; i++) {
        try {
          // getListingDetails now returns disputed status as the last return value
          const details = await marketplace.getListingDetails(i);
          // details: [seller, staticPrice, currentPrice, name, useDynamic, pair, usdPriceE8, disputed]
          if (details[0] !== ethers.ZeroAddress) {
            items.push({
              id: i,
              name: details[3],
              seller: details[0],
              price: ethers.formatEther(details[2]),
              disputed: details[7] // The new boolean
            });
          }
        } catch {
          // likely not listed
        }
      }
      setListings(items);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async (tokenId) => {
    if (!signer) return;
    try {
      const marketplace = new ethers.Contract(
        ARIA_MARKETPLACE_ADDRESS,
        ARIA_MARKETPLACE_ABI,
        signer
      );

      const tx = await marketplace.disputeAsset(tokenId);
      toast({
        title: "Dispute Submitted",
        description: "Transaction sent. Waiting for confirmation...",
        status: "info",
      });
      await tx.wait();

      toast({
        title: "Asset Disputed",
        description: `Asset #${tokenId} has been flagged as suspicious.`,
        status: "success",
      });
      fetchListings(); // refresh
    } catch (error) {
      console.error("Dispute error:", error);
      toast({
        title: "Dispute Failed",
        description: error.message,
        status: "error",
      });
    }
  };

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="2xl" mb={2}>Governance & Disputes</Heading>
          <Text fontSize="xl" color="gray.400">
            Community-driven verification. Flag suspicious assets to protect the ecosystem.
          </Text>
        </Box>

        {loading ? (
          <Box textAlign="center" py={20}>
            <Spinner size="xl" color="purple.500" />
            <Text mt={4}>Loading active listings...</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {listings.map((item) => (
              <Card key={item.id} bg="gray.800" borderColor={item.disputed ? "red.500" : "gray.700"} borderWidth="2px">
                <CardBody>
                  <Stack spacing={4}>
                    <HStack justify="space-between">
                      <Badge colorScheme="purple" fontSize="0.8em">Asset #{item.id}</Badge>
                      {item.disputed && <Badge colorScheme="red">SUSPICIOUS</Badge>}
                    </HStack>
                    
                    <Heading size="md">{item.name}</Heading>
                    <Text fontSize="sm" color="gray.400">Seller: {item.seller.slice(0,6)}...{item.seller.slice(-4)}</Text>
                    <Text fontWeight="bold" fontSize="lg">{parseFloat(item.price).toFixed(2)} ARIA</Text>
                    
                    <Divider />
                    
                    {item.disputed ? (
                      <Button isDisabled colorScheme="red" variant="outline" width="100%">
                        Under Review
                      </Button>
                    ) : (
                      <Button 
                        colorScheme="orange" 
                        variant="outline" 
                        onClick={() => handleDispute(item.id)}
                        _hover={{ bg: "orange.900" }}
                      >
                        🚩 Flag as Suspicious
                      </Button>
                    )}
                  </Stack>
                </CardBody>
              </Card>
            ))}
            {listings.length === 0 && (
              <Box gridColumn="1/-1" textAlign="center" py={10} bg="gray.800" borderRadius="md">
                <Text>No active listings found to govern.</Text>
              </Box>
            )}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}