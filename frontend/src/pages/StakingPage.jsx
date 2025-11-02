import { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Button, Input, InputGroup, InputRightAddon,
  Spinner, Stat, StatLabel, StatNumber, useToast, SimpleGrid, Divider, HStack,
  Alert, AlertIcon, AlertDescription
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import {
  MARKETPLACE_ADDRESS, MARKETPLACE_ABI,
  ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI,
  TOKEN_DISPLAY, TOKEN_DECIMALS
} from '../constants';

const StakingPage = ({ address, signer }) => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [balances, setBalances] = useState({
    aria: 0n,
    staked: 0n,
    rewards: 0n
  });
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [totalStaked, setTotalStaked] = useState(0n);
  const toast = useToast();

  // -------------------------
  // Fetch all balances
  // -------------------------
  const fetchBalances = useCallback(async () => {
    if (!signer || !address) {
      setBalances({ aria: 0n, staked: 0n, rewards: 0n });
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('🔄 Fetching balances for:', address);

    try {
      // Create contract instances (read-only with provider)
      const provider = signer.provider;
      const ariaToken = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, provider);
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

      // Fetch all data in parallel
      const [ariaBal, stakedBal, rewardsBal, totalStakedAmount] = await Promise.all([
        ariaToken.balanceOf(address),
        marketplace.stakedBalances(address),
        marketplace.getClaimableRewardsFor(address),
        marketplace.totalStaked()
      ]);

      console.log('✅ Balances fetched:', {
        aria: ariaBal.toString(),
        staked: stakedBal.toString(),
        rewards: rewardsBal.toString(),
        totalStaked: totalStakedAmount.toString()
      });

      setBalances({
        aria: ariaBal,
        staked: stakedBal,
        rewards: rewardsBal
      });
      setTotalStaked(totalStakedAmount);

    } catch (err) {
      console.error('❌ fetchBalances error:', err);
      toast({
        title: 'Error fetching balances',
        description: err.message || 'See console for details',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  }, [address, signer, toast]);

  useEffect(() => {
    if (address && signer) {
      fetchBalances();
    }
  }, [address, signer, fetchBalances]);

  // -------------------------
  // Stake ARIA tokens
  // -------------------------
  const handleStake = async () => {
    const rawAmount = parseFloat(stakeAmount || '0');
    if (!rawAmount || rawAmount <= 0) {
      return toast({
        title: 'Invalid amount',
        description: 'Please enter a valid stake amount',
        status: 'warning',
        duration: 3000
      });
    }

    if (!signer) {
      return toast({
        title: 'Wallet not connected',
        status: 'error',
        duration: 3000
      });
    }

    setActionLoading(true);

    try {
      const ariaToken = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, signer);
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // Convert to wei
      const amount = ethers.parseUnits(stakeAmount, TOKEN_DECIMALS);
      console.log('💰 Staking amount:', amount.toString());

      // Check balance
      if (balances.aria < amount) {
        throw new Error('Insufficient ARIA balance');
      }

      // Step 1: Approve marketplace to spend ARIA
      toast({
        title: 'Step 1/2: Approving ARIA tokens',
        status: 'info',
        duration: null,
        isClosable: false
      });

      const approveTx = await ariaToken.approve(MARKETPLACE_ADDRESS, amount);
      console.log('⏳ Approval tx:', approveTx.hash);
      await approveTx.wait();
      console.log('✅ Approval confirmed');

      toast.closeAll();

      // Step 2: Stake tokens
      toast({
        title: 'Step 2/2: Staking tokens',
        status: 'info',
        duration: null,
        isClosable: false
      });

      const stakeTx = await marketplace.stake(amount);
      console.log('⏳ Stake tx:', stakeTx.hash);
      await stakeTx.wait();
      console.log('✅ Stake confirmed');

      toast.closeAll();
      toast({
        title: 'Staking Successful! 🎉',
        description: `Staked ${stakeAmount} ${TOKEN_DISPLAY}`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      setStakeAmount('');
      await fetchBalances();

    } catch (err) {
      console.error('❌ Stake error:', err);
      toast.closeAll();

      let errorMsg = 'Transaction failed';
      if (err.message?.includes('user rejected')) {
        errorMsg = 'Transaction was rejected';
      } else if (err.reason) {
        errorMsg = err.reason;
      } else if (err.message) {
        errorMsg = err.message;
      }

      toast({
        title: 'Staking Failed',
        description: errorMsg,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------
  // Unstake ARIA tokens
  // -------------------------
  const handleUnstake = async () => {
    const rawAmount = parseFloat(unstakeAmount || '0');
    if (!rawAmount || rawAmount <= 0) {
      return toast({
        title: 'Invalid amount',
        description: 'Please enter a valid unstake amount',
        status: 'warning',
        duration: 3000
      });
    }

    if (!signer) {
      return toast({
        title: 'Wallet not connected',
        status: 'error',
        duration: 3000
      });
    }

    setActionLoading(true);

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // Convert to wei
      const amount = ethers.parseUnits(unstakeAmount, TOKEN_DECIMALS);
      console.log('💰 Unstaking amount:', amount.toString());

      // Check staked balance
      if (balances.staked < amount) {
        throw new Error('Insufficient staked balance');
      }

      toast({
        title: 'Unstaking tokens...',
        status: 'info',
        duration: null,
        isClosable: false
      });

      const unstakeTx = await marketplace.unstake(amount);
      console.log('⏳ Unstake tx:', unstakeTx.hash);
      await unstakeTx.wait();
      console.log('✅ Unstake confirmed');

      toast.closeAll();
      toast({
        title: 'Unstaking Successful! 🎉',
        description: `Unstaked ${unstakeAmount} ${TOKEN_DISPLAY}`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      setUnstakeAmount('');
      await fetchBalances();

    } catch (err) {
      console.error('❌ Unstake error:', err);
      toast.closeAll();

      let errorMsg = 'Transaction failed';
      if (err.message?.includes('user rejected')) {
        errorMsg = 'Transaction was rejected';
      } else if (err.reason) {
        errorMsg = err.reason;
      } else if (err.message) {
        errorMsg = err.message;
      }

      toast({
        title: 'Unstaking Failed',
        description: errorMsg,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------
  // Claim rewards
  // -------------------------
  const handleClaim = async () => {
    if (!balances.rewards || balances.rewards === 0n) {
      return toast({
        title: 'No rewards available',
        description: 'You have no ARIA rewards to claim yet',
        status: 'info',
        duration: 3000
      });
    }

    if (!signer) {
      return toast({
        title: 'Wallet not connected',
        status: 'error',
        duration: 3000
      });
    }

    setActionLoading(true);

    try {
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast({
        title: 'Claiming rewards...',
        status: 'info',
        duration: null,
        isClosable: false
      });

      const claimTx = await marketplace.claimRewards();
      console.log('⏳ Claim tx:', claimTx.hash);
      await claimTx.wait();
      console.log('✅ Claim confirmed');

      toast.closeAll();
      toast({
        title: 'Rewards Claimed! 💰',
        description: `Claimed ${formatBalance(balances.rewards)} ${TOKEN_DISPLAY}`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      await fetchBalances();

    } catch (err) {
      console.error('❌ Claim error:', err);
      toast.closeAll();

      let errorMsg = 'Transaction failed';
      if (err.message?.includes('user rejected')) {
        errorMsg = 'Transaction was rejected';
      } else if (err.reason) {
        errorMsg = err.reason;
      } else if (err.message) {
        errorMsg = err.message;
      }

      toast({
        title: 'Claim Failed',
        description: errorMsg,
        status: 'error',
        duration: 7000,
        isClosable: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------
  // Format balance helper
  // -------------------------
  const formatBalance = (val) => {
    try {
      if (!val || val === 0n) return '0.00';

      // Convert BigInt to number with proper decimals
      const scaled = Number(val) / (10 ** TOKEN_DECIMALS);

      return scaled.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    } catch (err) {
      console.error('Format error:', err);
      return '0.00';
    }
  };

  // Calculate staking percentage
  const getStakingPercentage = () => {
    if (!totalStaked || totalStaked === 0n) return '0.00';
    if (!balances.staked || balances.staked === 0n) return '0.00';

    const percentage = (Number(balances.staked) / Number(totalStaked)) * 100;
    return percentage.toFixed(2);
  };

  // -------------------------
  // Render
  // -------------------------
  if (!address) {
    return (
      <Box p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" bg="gray.800">
        <VStack spacing={4} py={10}>
          <Heading size="lg">ARIA Staking</Heading>
          <Text color="gray.400">Please connect your wallet to access staking</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" bg="gray.800">
      <VStack spacing={4} mb={6}>
        <Heading as="h2" size="lg" textAlign="center">
          💎 ARIA Staking & Rewards
        </Heading>
        <Text fontSize="sm" color="gray.400" textAlign="center" maxW="2xl">
          Stake your ARIA tokens to earn proportional rewards from marketplace fees
        </Text>
      </VStack>

      <HStack spacing={3} mb={4} flexWrap="wrap" justify="space-between">
        <Button size="sm" onClick={fetchBalances} colorScheme="blue" leftIcon={<span>🔄</span>}>
          Refresh
        </Button>
        <Text fontSize="xs" color="gray.400">
          {address.slice(0, 8)}...{address.slice(-6)}
        </Text>
      </HStack>

      {loading ? (
        <VStack py={8}>
          <Spinner size="xl" />
          <Text color="gray.400">Loading balances...</Text>
        </VStack>
      ) : (
        <>
          {/* Balance Cards */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
            <Box p={4} bg="gray.700" borderRadius="lg" textAlign="center">
              <Stat>
                <StatLabel color="gray.400">Your ARIA Balance</StatLabel>
                <StatNumber fontSize="2xl" color="purple.300">
                  {formatBalance(balances.aria)}
                </StatNumber>
                <Text fontSize="xs" color="gray.500" mt={1}>{TOKEN_DISPLAY}</Text>
              </Stat>
            </Box>

            <Box p={4} bg="gray.700" borderRadius="lg" textAlign="center">
              <Stat>
                <StatLabel color="gray.400">Staked ARIA</StatLabel>
                <StatNumber fontSize="2xl" color="blue.300">
                  {formatBalance(balances.staked)}
                </StatNumber>
                <Text fontSize="xs" color="gray.500" mt={1}>{TOKEN_DISPLAY}</Text>
                <Text fontSize="xs" color="blue.400" mt={2}>
                  {getStakingPercentage()}% of total
                </Text>
              </Stat>
            </Box>

            <Box p={4} bg="gray.700" borderRadius="lg" textAlign="center">
              <Stat>
                <StatLabel color="gray.400">Claimable Rewards</StatLabel>
                <StatNumber fontSize="2xl" color="green.300">
                  {formatBalance(balances.rewards)}
                </StatNumber>
                <Text fontSize="xs" color="gray.500" mt={1}>{TOKEN_DISPLAY}</Text>
              </Stat>
            </Box>
          </SimpleGrid>

          {/* Info Alert */}
          <Alert status="info" mb={6} borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              Total staked in pool: <strong>{formatBalance(totalStaked)} {TOKEN_DISPLAY}</strong>
              {' • '}
              Rewards are distributed proportionally based on your share of the pool
            </AlertDescription>
          </Alert>

          <Divider my={6} />

          {/* Stake/Unstake Actions */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={6}>
            {/* Stake Section */}
            <VStack spacing={4} align="stretch">
              <Heading size="md" color="purple.300">Stake Your ARIA</Heading>
              <InputGroup>
                <Input
                  placeholder="Amount to Stake"
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  step="0.000001"
                />
                <InputRightAddon>{TOKEN_DISPLAY}</InputRightAddon>
              </InputGroup>
              <Button
                onClick={() => setStakeAmount(formatBalance(balances.aria))}
                size="xs"
                variant="link"
                colorScheme="purple"
                alignSelf="flex-start"
              >
                Max: {formatBalance(balances.aria)} {TOKEN_DISPLAY}
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleStake}
                isLoading={actionLoading}
                isDisabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || balances.aria === 0n}
                width="100%"
                size="lg"
              >
                Stake ARIA
              </Button>
            </VStack>

            {/* Unstake Section */}
            <VStack spacing={4} align="stretch">
              <Heading size="md" color="orange.300">Unstake Your ARIA</Heading>
              <InputGroup>
                <Input
                  placeholder="Amount to Unstake"
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  step="0.000001"
                />
                <InputRightAddon>{TOKEN_DISPLAY}</InputRightAddon>
              </InputGroup>
              <Button
                onClick={() => setUnstakeAmount(formatBalance(balances.staked))}
                size="xs"
                variant="link"
                colorScheme="orange"
                alignSelf="flex-start"
              >
                Max: {formatBalance(balances.staked)} {TOKEN_DISPLAY}
              </Button>
              <Button
                colorScheme="orange"
                onClick={handleUnstake}
                isLoading={actionLoading}
                isDisabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || balances.staked === 0n}
                width="100%"
                size="lg"
              >
                Unstake ARIA
              </Button>
            </VStack>
          </SimpleGrid>

          {/* Claim Rewards Section */}
          <VStack spacing={4}>
            <Button
              colorScheme="green"
              size="lg"
              onClick={handleClaim}
              isLoading={actionLoading}
              isDisabled={balances.rewards === 0n}
              width={{ base: '100%', md: '400px' }}
              leftIcon={<span>💰</span>}
            >
              Claim {formatBalance(balances.rewards)} {TOKEN_DISPLAY} Rewards
            </Button>
            <Text fontSize="xs" color="gray.500">
              Rewards accumulate based on marketplace trading fees
            </Text>
          </VStack>
        </>
      )}
    </Box>
  );
};

export default StakingPage;