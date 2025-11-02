// import { useState, useEffect, useCallback } from 'react';
// import { Box, Button, Heading, Text, VStack, Spinner, SimpleGrid, Image, useToast, Badge, HStack } from '@chakra-ui/react';
// import { cvToJSON, uintCV, cvToHex, Pc, deserializeCV } from '@stacks/transactions';

// import { STACKS_NETWORK, RWA_NFT_CONTRACT_ID, MARKETPLACE_CONTRACT_ID, DENOM_DISPLAY, DENOM_DECIMALS } from '../constants';

// const MarketplacePage = ({ address }) => {
//   const [listings, setListings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [debugInfo, setDebugInfo] = useState(null);
//   const [lastRefresh, setLastRefresh] = useState(null);
//   const [interestedNfts, setInterestedNfts] = useState(new Set());
//   const toast = useToast();

//   const callReadOnly = async (contractId, functionName, functionArgs) => {
//     try {
//       const [contractAddress, contractName] = contractId.split('.');
//       const url = `${STACKS_NETWORK.client.baseUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
      
//       console.log('📡 Calling read-only:', { contractId, functionName, url });
      
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           sender: address, 
//           arguments: functionArgs.map(cvToHex) 
//         }),
//       });
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error('❌ Read-only call failed:', errorText);
//         throw new Error(`Failed to call ${functionName}: ${response.status}`);
//       }
      
//       const data = await response.json();
//       console.log('✅ Read-only result RAW:', { functionName, rawData: data });
//       console.log('✅ Result structure:', JSON.stringify(data, null, 2));
      
//       if (!data.okay) {
//         console.error('❌ Contract returned not okay:', data);
//         throw new Error(`Read-only call failed: ${data.cause}`);
//       }
      
//       const clarityValue = deserializeCV(data.result);
//       console.log('✅ Deserialized Clarity Value:', clarityValue);
      
//       const parsedResult = cvToJSON(clarityValue);
//       console.log('✅ Parsed CV result:', parsedResult);
      
//       return parsedResult;
//     } catch (error) {
//       console.error('❌ callReadOnly error:', error);
//       throw error;
//     }
//   };

//   const fetchListings = useCallback(async () => {
//     setLoading(true);
//     const debug = { step: '', error: null, lastTokenId: 0, listings: [] };

//     try {
//       debug.step = 'Fetching last token ID';
//       console.log('🔍 Step 1: Getting last token ID from', RWA_NFT_CONTRACT_ID);

//       const lastTokenIdResult = await callReadOnly(
//         RWA_NFT_CONTRACT_ID,
//         'get-last-token-id',
//         []
//       );
//       console.log('📊 Last token ID result RAW:', lastTokenIdResult);
//       console.log('📊 Full result structure:', JSON.stringify(lastTokenIdResult, null, 2));

//       let lastTokenId = 0;

//       if (
//         (lastTokenIdResult.type === 'ok' || lastTokenIdResult.success === true) &&
//         lastTokenIdResult.value
//       ) {
//         const innerValue = lastTokenIdResult.value;
//         if (innerValue.type === 'uint' || innerValue.type === 'int') {
//           lastTokenId = Number(innerValue.value);
//         } else if (typeof innerValue === 'string' || typeof innerValue === 'number') {
//           lastTokenId = parseInt(innerValue);
//         }
//       } else if (lastTokenIdResult.success !== undefined) {
//         lastTokenId = parseInt(lastTokenIdResult.value || 0);
//       } else if (lastTokenIdResult.value !== undefined) {
//         lastTokenId = parseInt(lastTokenIdResult.value);
//       }

//       debug.lastTokenId = lastTokenId;
//       console.log('🎯 Parsed last token ID:', lastTokenId);

//       if (lastTokenId === 0) {
//         console.log('ℹ️ No NFTs minted yet (or transactions still pending)');
//         setListings([]);
//         setDebugInfo({
//           ...debug,
//           step: 'No NFTs found. If you just minted, wait 30-60 seconds and refresh.',
//         });
//         return;
//       }

//       debug.step = `Checking ${lastTokenId} tokens for listings`;
//       console.log(`🔍 Step 2: Checking tokens 1–${lastTokenId} for listings`);

//       const listingPromises = [];

//       for (let i = 1; i <= lastTokenId; i++) {
//         listingPromises.push(
//           (async () => {
//             try {
//               console.log(`🔍 Checking listing for token #${i}`);
//               const listingResult = await callReadOnly(
//                 MARKETPLACE_CONTRACT_ID,
//                 'get-listing',
//                 [uintCV(i)]
//               );

//               console.log(`🧩 Listing result (raw JSON) for token #${i}:`, JSON.stringify(listingResult, null, 2));

//               if (!listingResult || listingResult.type === 'none' || !listingResult.value) {
//                 console.log(`⏭️ Token #${i} is not listed`);
//                 return null;
//               }

//               if (
//                 listingResult.type === 'some' ||
//                 listingResult.type?.startsWith('(optional') ||
//                 listingResult.value?.price
//               ) {
//                 const listingData = listingResult.value?.value || listingResult.value;
//                 console.log(`📋 Token #${i} listing data:`, listingData);

//                 const priceCV = listingData.price?.value !== undefined ? listingData.price.value : listingData.price;
//                 const sellerCV = listingData.seller?.value !== undefined ? listingData.seller.value : listingData.seller;

//                 console.log(`📝 Fetching metadata for token #${i}`);
//                 const metadataUriResult = await callReadOnly(
//                   RWA_NFT_CONTRACT_ID,
//                   'get-token-uri',
//                   [uintCV(i)]
//                 );
//                 console.log(`🗂️ Token #${i} metadata URI result:`, metadataUriResult);

//                 let ipfsHash = null;
//                 const resp = metadataUriResult.value;

//                 if (!resp) {
//                   console.warn(`⚠️ No response found for token #${i}`, metadataUriResult);
//                   return null;
//                 }

//                 if (resp.value && resp.value.value) {
//                   ipfsHash = resp.value.value;
//                 } else if (resp.value && typeof resp.value === 'string') {
//                   ipfsHash = resp.value;
//                 }

//                 if (!ipfsHash || typeof ipfsHash !== 'string') {
//                   console.warn(`⚠️ No valid IPFS hash found for token #${i}`, metadataUriResult);
//                   return null;
//                 }

//                 console.log(`🌐 Fetching IPFS metadata for token #${i} from ${ipfsHash}`);
//                 const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

//                 try {
//                   const metadataResponse = await fetch(metadataUrl);
//                   if (!metadataResponse.ok) throw new Error(`HTTP ${metadataResponse.status}`);

//                   const metadata = await metadataResponse.json();
//                   console.log(`✅ Got metadata for token #${i}:`, metadata);

//                   const numPrice = Number(priceCV);
//                   console.log(`💰 Token #${i} price parsed as:`, numPrice, 'from:', priceCV);
                  
//                   return {
//                     tokenId: i,
//                     price: numPrice,
//                     seller: sellerCV,
//                     metadata,
//                   };
//                 } catch (err) {
//                   console.error(`❌ Failed to fetch IPFS metadata for token #${i}:`, err);
//                   return null;
//                 }
//               }

//               console.warn(`⚠️ Unexpected listing result type for token #${i}:`, listingResult.type);
//               return null;
//             } catch (err) {
//               console.error(`❌ Error fetching token #${i}:`, err);
//               return null;
//             }
//           })()
//         );
//       }

//       const results = await Promise.all(listingPromises);
//       const validListings = results.filter((r) => r !== null);

//       console.log('✅ Final listings:', validListings);
//       debug.step = 'Complete';

//       setListings(validListings);
//       setDebugInfo(debug);
//       setLastRefresh(new Date());

//       if (validListings.length === 0) {
//         toast({
//           title: 'No Listings Found',
//           description: `${lastTokenId} NFT(s) minted, but none are listed for sale.`,
//           status: 'info',
//         });
//       }
//     } catch (e) {
//       console.error('❌ Error fetching listings:', e);
//       debug.error = e.message;
//       debug.step = 'Failed: ' + debug.step;
//       setDebugInfo(debug);

//       toast({
//         title: 'Error',
//         description: `Could not fetch marketplace listings: ${e.message}`,
//         status: 'error',
//         duration: 8000,
//       });
//     } finally {
//       setLoading(false);
//     }
//   }, [address, toast]);

//   useEffect(() => { 
//     if (address) {
//       fetchListings(); 
//     }
//   }, [fetchListings, address]);

//   const handleRegisterInterest = (listing) => {
//     const newInterested = new Set(interestedNfts);
//     newInterested.add(listing.tokenId);
//     setInterestedNfts(newInterested);

//     toast({
//       title: "🎯 Interest Registered!",
//       description: `You've registered interest in NFT #${listing.tokenId}. Public sale launches soon!`,
//       status: "success",
//       duration: 4000,
//       isClosable: true,
//     });
//   };

//   if (loading) {
//     return (
//       <VStack py={10}>
//         <Spinner size="xl" />
//         <Text>Loading marketplace...</Text>
//         {debugInfo && (
//           <Text fontSize="sm" color="gray.500">
//             {debugInfo.step}
//           </Text>
//         )}
//       </VStack>
//     );
//   }

//   return (
//     <Box mt={2} p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" bg="gray.800">
//       <VStack spacing={4} mb={6}>
//         <Badge colorScheme="purple" fontSize="md" px={4} py={2}>
//           🌟 PRESALE PREVIEW
//         </Badge>
//         <Heading as="h2" size="lg" textAlign="center">Premium RWA Marketplace</Heading>
//         <Text fontSize="sm" color="gray.400" textAlign="center" maxW="2xl">
//           AI-verified real-world assets • Public sale launching soon
//         </Text>
        
//         <Button 
//           onClick={fetchListings} 
//           colorScheme="blue" 
//           size="sm"
//           leftIcon={<span>🔄</span>}
//         >
//           Refresh Marketplace
//         </Button>
        
//         {lastRefresh && (
//           <Text fontSize="xs" color="gray.500">
//             Last updated: {lastRefresh.toLocaleTimeString()}
//           </Text>
//         )}
//       </VStack>
      
//       {debugInfo && (
//         <Box mb={4} p={4} bg="gray.700" borderRadius="md" fontSize="sm" borderWidth="1px" borderColor="blue.500">
//           <VStack align="stretch" spacing={2}>
//             <Text><strong>🔍 Status:</strong> {debugInfo.step}</Text>
//             <Text><strong>📊 Total NFTs Minted:</strong> {debugInfo.lastTokenId}</Text>
//             <Text><strong>🏪 Listed for Sale:</strong> {listings.length}</Text>
//             {debugInfo.error && (
//               <Text color="red.300"><strong>❌ Error:</strong> {debugInfo.error}</Text>
//             )}
//             {debugInfo.lastTokenId > 0 && listings.length === 0 && (
//               <Text color="yellow.300">
//                 ⚠️ NFTs exist but none are listed. Make sure you clicked "List on Marketplace" after minting!
//               </Text>
//             )}
//           </VStack>
//         </Box>
//       )}
      
//       {listings.length === 0 ? (
//         <VStack spacing={4} py={8}>
//           <Text textAlign="center" fontSize="lg">No RWA NFTs are currently listed for sale.</Text>
//           {debugInfo && debugInfo.lastTokenId > 0 && (
//             <VStack spacing={3}>
//               <Badge colorScheme="blue" p={3} fontSize="md">
//                 📦 {debugInfo.lastTokenId} NFT(s) exist but are not listed
//               </Badge>
//               <Text fontSize="sm" color="gray.400" maxW="md" textAlign="center">
//                 If you just minted and listed an NFT, it may take 30-60 seconds to appear. 
//                 Click "Refresh Marketplace" above to check again.
//               </Text>
//             </VStack>
//           )}
//           {(!debugInfo || debugInfo.lastTokenId === 0) && (
//             <Text fontSize="sm" color="gray.400">
//               💡 Mint your first RWA NFT on the Home page to get started!
//             </Text>
//           )}
//         </VStack>
//       ) : (
//         <>
//           <HStack justify="space-between" mb={4}>
//             <Text color="gray.400">
//               {listings.length} premium listing(s) • Presale mode active
//             </Text>
//             <Badge colorScheme="green" fontSize="sm">✨ AI-Verified</Badge>
//           </HStack>
          
//           <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
//             {listings.map((listing) => (
//               <Box 
//                 key={listing.tokenId} 
//                 p={5} 
//                 shadow="md" 
//                 borderWidth="1px" 
//                 borderRadius="md" 
//                 bg="gray.700"
//                 borderColor={interestedNfts.has(listing.tokenId) ? "purple.500" : "gray.600"}
//                 transition="all 0.2s"
//               >
//                 <VStack spacing={4}>
//                   <HStack justify="space-between" width="100%">
//                     <Badge colorScheme="purple">NFT #{listing.tokenId}</Badge>
//                     <Badge colorScheme="orange" fontSize="xs">PRESALE</Badge>
//                   </HStack>
                  
//                   <Image
//                     src="https://i.postimg.cc/PJY2gmC0/LOGO.png"
//                     alt={listing.metadata.name}
//                     borderRadius="md"
//                     boxSize="200px"
//                     objectFit="cover"
//                     fallbackSrc="https://i.postimg.cc/PJY2gmC0/LOGO.png"
//                   />
                  
//                   <Heading size="md" noOfLines={1}>{listing.metadata.name}</Heading>
                  
//                   <Box bg="gray.800" p={3} borderRadius="md" width="100%">
//                     <Text fontSize="xs" color="gray.400">Estimated Value</Text>
//                     <Text fontWeight="bold" fontSize="lg" color="purple.300">
//                       {listing.price / (10 ** DENOM_DECIMALS)} {DENOM_DISPLAY}
//                     </Text>
//                   </Box>
                  
//                   <Button
//                     colorScheme="purple"
//                     width="100%"
//                     onClick={() => handleRegisterInterest(listing)}
//                     isDisabled={address === listing.seller}
//                     variant={interestedNfts.has(listing.tokenId) ? "solid" : "outline"}
//                   >
//                     {address === listing.seller 
//                       ? "Your Listing" 
//                       : interestedNfts.has(listing.tokenId)
//                       ? "Interest Registered ✓"
//                       : "Register Interest"}
//                   </Button>
                  
//                   <Text fontSize="xs" color="gray.500" textAlign="center">
//                     🚀 Public sale launching soon
//                   </Text>
//                 </VStack>
//               </Box>
//             ))}
//           </SimpleGrid>

//           <Box mt={8} p={6} bg="purple.900" borderRadius="lg" borderWidth="1px" borderColor="purple.600">
//             <VStack spacing={3}>
//               <Heading size="sm" color="purple.200">
//                 💎 Exclusive Presale Preview
//               </Heading>
//               <Text fontSize="sm" color="purple.100" textAlign="center">
//                 These AI-verified RWA NFTs are in presale mode. Register your interest to be among 
//                 the first notified when public trading launches. Each asset is thoroughly verified and blockchain-secured.
//               </Text>
//               <HStack spacing={4} mt={2} flexWrap="wrap" justify="center">
//                 <Badge colorScheme="green">AI Verified</Badge>
//                 <Badge colorScheme="blue">Blockchain Secured</Badge>
//                 <Badge colorScheme="purple">Premium Assets</Badge>
//               </HStack>
//             </VStack>
//           </Box>
//         </>
//       )}
//     </Box>
//   );
// };

// export default MarketplacePage;

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';

export default function MarketplacePage() {
  return (
    <Container centerContent py={20}>
      <VStack spacing={4}>
        <Heading size="2xl">Marketplace</Heading>
        <Text fontSize="xl" color="gray.400">This feature is coming soon! �</Text>
      </VStack>
    </Container>
  );
}