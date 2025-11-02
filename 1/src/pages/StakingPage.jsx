// import { useState, useEffect, useCallback } from 'react';
// import {
//   Box, Heading, Text, VStack, Button, Input, InputGroup, InputRightAddon,
//   Spinner, Stat, StatLabel, StatNumber, useToast, SimpleGrid, Divider, HStack
// } from '@chakra-ui/react';
// import {
//   cvToHex, uintCV, standardPrincipalCV, deserializeCV, cvToJSON
// } from '@stacks/transactions';
// import {
//   STACKS_NETWORK, STAKING_CONTRACT_ID, ARIA_TOKEN_CONTRACT_ID,
//   TOKEN_DISPLAY, DENOM_DECIMALS
// } from '../constants';

// const StakingPage = ({ address }) => {
//   const [loading, setLoading] = useState(true);
//   const [actionLoading, setActionLoading] = useState(false);
//   const [balances, setBalances] = useState({ aria: 0n, staked: 0n, rewards: 0n });
//   const [stakeAmount, setStakeAmount] = useState('');
//   const [unstakeAmount, setUnstakeAmount] = useState('');
//   const toast = useToast();

//   // -------------------------
//   // callReadOnly - proper parsing
//   // -------------------------
//   const callReadOnly = async (contractId, functionName, functionArgs = []) => {
//     if (!address) return 0n;

//     try {
//       const [contractAddress, contractName] = contractId.split('.');
//       const url = `${STACKS_NETWORK.client.baseUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
      
//       console.log(`📡 Calling ${functionName}:`, { contractId, args: functionArgs });
      
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           sender: address,
//           arguments: functionArgs.map(cvToHex)
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}`);
//       }

//       const data = await response.json();
//       console.log(`✅ ${functionName} raw response:`, data);

//       if (!data.okay) {
//         console.error(`❌ Contract call failed:`, data);
//         return 0n;
//       }

//       // Deserialize and parse the Clarity value
//       const clarityValue = deserializeCV(data.result);
//       const parsed = cvToJSON(clarityValue);
//       console.log(`✅ ${functionName} parsed:`, parsed);

//       // Extract the uint value
//       let result = 0n;
      
//       if (parsed.type === 'uint') {
//         result = BigInt(parsed.value);
//       } else if (parsed.value !== undefined) {
//         // Handle nested structures
//         const val = parsed.value;
//         if (typeof val === 'string') {
//           result = BigInt(val.startsWith('u') ? val.slice(1) : val);
//         } else if (val.type === 'uint') {
//           result = BigInt(val.value);
//         } else if (typeof val === 'number' || typeof val === 'bigint') {
//           result = BigInt(val);
//         }
//       }

//       console.log(`✅ ${functionName} final BigInt:`, result.toString());
//       return result;

//     } catch (err) {
//       console.error(`❌ callReadOnly error for ${functionName}:`, err);
//       return 0n;
//     }
//   };

//   // -------------------------
//   // Fetch balances
//   // -------------------------
//   const fetchBalances = useCallback(async () => {
//     if (!address) {
//       setBalances({ aria: 0n, staked: 0n, rewards: 0n });
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     console.log('🔄 Fetching balances for:', address);

//     try {
//       const [ariaBal, stakedBal, rewardsBal] = await Promise.all([
//         callReadOnly(ARIA_TOKEN_CONTRACT_ID, 'get-balance', [standardPrincipalCV(address)]),
//         callReadOnly(STAKING_CONTRACT_ID, 'get-staked-balance-for', [standardPrincipalCV(address)]),
//         callReadOnly(STAKING_CONTRACT_ID, 'get-claimable-rewards-for', [standardPrincipalCV(address)])
//       ]);

//       console.log('✅ All balances fetched:', {
//         aria: ariaBal.toString(),
//         staked: stakedBal.toString(),
//         rewards: rewardsBal.toString()
//       });

//       setBalances({ 
//         aria: ariaBal, 
//         staked: stakedBal, 
//         rewards: rewardsBal 
//       });

//     } catch (err) {
//       console.error('❌ fetchBalances error:', err);
//       toast({ 
//         title: 'Error fetching balances', 
//         description: err.message || String(err),
//         status: 'error',
//         duration: 5000
//       });
//     } finally {
//       setLoading(false);
//     }
//   }, [address, toast]);

//   useEffect(() => { 
//     if (address) {
//       fetchBalances(); 
//     }
//   }, [address, fetchBalances]);

//   // -------------------------
//   // Leather contract calls
//   // -------------------------
//   const callContract = async (fnName, fnArgs = []) => {
//     if (!address) {
//       return toast({ 
//         title: 'Wallet not connected', 
//         status: 'warning' 
//       });
//     }

//     setActionLoading(true);
//     try {
//       const [contractAddr, contractName] = STAKING_CONTRACT_ID.split('.');
//       const networkMode = STACKS_NETWORK.client.baseUrl.includes('mainnet') ? 'mainnet' : 'testnet';

//       console.log(`📤 Calling ${fnName} with args:`, fnArgs);

//       await window.LeatherProvider.request('stx_callContract', {
//         contract: `${contractAddr}.${contractName}`,
//         functionName: fnName,
//         functionArgs: fnArgs.map(a => cvToHex(a)),
//         network: networkMode,
//       });

//       toast({ 
//         title: `${fnName} submitted!`, 
//         description: 'Transaction pending confirmation',
//         status: 'success',
//         duration: 4000
//       });

//       // Wait for transaction to process
//       setTimeout(() => {
//         fetchBalances();
//       }, 4000);

//     } catch (err) {
//       console.error(`❌ ${fnName} error:`, err);
//       toast({ 
//         title: `${fnName} failed`, 
//         description: err?.error?.message || err?.message || String(err), 
//         status: 'error',
//         duration: 6000
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   // -------------------------
//   // Handlers
//   // -------------------------
//   const handleStake = async () => {
//     const rawAmount = parseFloat(stakeAmount || '0');
//     if (!rawAmount || rawAmount <= 0) {
//       return toast({ 
//         title: 'Invalid amount', 
//         description: 'Please enter a valid stake amount',
//         status: 'warning' 
//       });
//     }

//     // Convert to micro-units
//     const amount = BigInt(Math.floor(rawAmount * (10 ** DENOM_DECIMALS)));
    
//     console.log('Staking:', { rawAmount, microUnits: amount.toString() });

//     await callContract('stake', [uintCV(amount)]);
//     setStakeAmount('');
//   };

//   const handleUnstake = async () => {
//     const rawAmount = parseFloat(unstakeAmount || '0');
//     if (!rawAmount || rawAmount <= 0) {
//       return toast({ 
//         title: 'Invalid amount',
//         description: 'Please enter a valid unstake amount',
//         status: 'warning' 
//       });
//     }

//     // Convert to micro-units
//     const amount = BigInt(Math.floor(rawAmount * (10 ** DENOM_DECIMALS)));
    
//     console.log('Unstaking:', { rawAmount, microUnits: amount.toString() });

//     await callContract('unstake', [uintCV(amount)]);
//     setUnstakeAmount('');
//   };

//   const handleClaim = async () => {
//     if (!balances.rewards || balances.rewards === 0n) {
//       return toast({ 
//         title: 'No rewards available', 
//         description: 'You have no STX rewards to claim yet',
//         status: 'info' 
//       });
//     }
//     await callContract('claim-rewards', []);
//   };

//   // -------------------------
//   // Formatting - CRITICAL FIX
//   // -------------------------
//   const formatBalance = (val) => {
//     try {
//       if (!val || val === 0n) return '0';
      
//       // Convert BigInt to number, divide by decimals
//       const scaled = Number(val) / (10 ** DENOM_DECIMALS);
      
//       // Format with proper decimals
//       return scaled.toLocaleString(undefined, { 
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 6 
//       });
//     } catch (err) {
//       console.error('Format error:', err);
//       return '0';
//     }
//   };

//   return (
//     <Box p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" bg="gray.800">
//       <VStack spacing={4} mb={6}>
//         <Heading as="h2" size="lg" textAlign="center">
//           ARIA Staking & Rewards
//         </Heading>
//         <Text fontSize="sm" color="gray.400" textAlign="center" maxW="2xl">
//           Stake your ARIA tokens to earn proportional STX rewards from marketplace fees
//         </Text>
//       </VStack>

//       <HStack spacing={3} mb={4} flexWrap="wrap">
//         <Button size="sm" onClick={fetchBalances} colorScheme="blue" leftIcon={<span>🔄</span>}>
//           Refresh
//         </Button>
//         {address ? (
//           <Text fontSize="xs" color="gray.400">
//             {address.slice(0, 8)}...{address.slice(-6)}
//           </Text>
//         ) : (
//           <Text fontSize="xs" color="orange.400">
//             Connect wallet to view balances
//           </Text>
//         )}
//       </HStack>

//       {loading ? (
//         <VStack py={8}>
//           <Spinner size="xl" />
//           <Text color="gray.400">Loading balances...</Text>
//         </VStack>
//       ) : (
//         <>
//           <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
//             <Box p={4} bg="gray.700" borderRadius="lg" textAlign="center">
//               <Stat>
//                 <StatLabel color="gray.400">Your ARIA Balance</StatLabel>
//                 <StatNumber fontSize="2xl" color="purple.300">
//                   {formatBalance(balances.aria)}
//                 </StatNumber>
//                 <Text fontSize="xs" color="gray.500" mt={1}>{TOKEN_DISPLAY}</Text>
//               </Stat>
//             </Box>

//             <Box p={4} bg="gray.700" borderRadius="lg" textAlign="center">
//               <Stat>
//                 <StatLabel color="gray.400">Staked ARIA</StatLabel>
//                 <StatNumber fontSize="2xl" color="blue.300">
//                   {formatBalance(balances.staked)}
//                 </StatNumber>
//                 <Text fontSize="xs" color="gray.500" mt={1}>{TOKEN_DISPLAY}</Text>
//               </Stat>
//             </Box>

//             <Box p={4} bg="gray.700" borderRadius="lg" textAlign="center">
//               <Stat>
//                 <StatLabel color="gray.400">Claimable Rewards</StatLabel>
//                 <StatNumber fontSize="2xl" color="green.300">
//                   {formatBalance(balances.rewards)}
//                 </StatNumber>
//                 <Text fontSize="xs" color="gray.500" mt={1}>STX</Text>
//               </Stat>
//             </Box>
//           </SimpleGrid>

//           <Divider my={6} />

//           <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={6}>
//             <VStack spacing={4} align="stretch">
//               <Heading size="md" color="purple.300">Stake Your ARIA</Heading>
//               <InputGroup>
//                 <Input 
//                   placeholder="Amount to Stake" 
//                   type="number" 
//                   value={stakeAmount} 
//                   onChange={(e) => setStakeAmount(e.target.value)}
//                   step="0.000001"
//                 />
//                 <InputRightAddon>{TOKEN_DISPLAY}</InputRightAddon>
//               </InputGroup>
//               <Button 
//                 colorScheme="purple" 
//                 onClick={handleStake} 
//                 isLoading={actionLoading} 
//                 isDisabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
//                 width="100%"
//                 size="lg"
//               >
//                 Stake ARIA
//               </Button>
//             </VStack>

//             <VStack spacing={4} align="stretch">
//               <Heading size="md" color="orange.300">Unstake Your ARIA</Heading>
//               <InputGroup>
//                 <Input 
//                   placeholder="Amount to Unstake" 
//                   type="number" 
//                   value={unstakeAmount} 
//                   onChange={(e) => setUnstakeAmount(e.target.value)}
//                   step="0.000001"
//                 />
//                 <InputRightAddon>{TOKEN_DISPLAY}</InputRightAddon>
//               </InputGroup>
//               <Button 
//                 colorScheme="orange" 
//                 onClick={handleUnstake} 
//                 isLoading={actionLoading} 
//                 isDisabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0}
//                 width="100%"
//                 size="lg"
//               >
//                 Unstake ARIA
//               </Button>
//             </VStack>
//           </SimpleGrid>

//           <VStack spacing={4}>
//             <Button 
//               colorScheme="green" 
//               size="lg" 
//               onClick={handleClaim} 
//               isLoading={actionLoading} 
//               isDisabled={balances.rewards === 0n}
//               width={{ base: '100%', md: '400px' }}
//               leftIcon={<span>💰</span>}
//             >
//               Claim {formatBalance(balances.rewards)} STX Rewards
//             </Button>
//             <Text fontSize="xs" color="gray.500">
//               Rewards are distributed proportionally based on your staked amount
//             </Text>
//           </VStack>
//         </>
//       )}
//     </Box>
//   );
// };

// export default StakingPage;

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';

export default function StakingPage() {
  return (
    <Container centerContent py={20}>
      <VStack spacing={4}>
        <Heading size="2xl">Staking</Heading>
        <Text fontSize="xl" color="gray.400">This feature is coming soon! 🤑</Text>
      </VStack>
    </Container>
  );
}