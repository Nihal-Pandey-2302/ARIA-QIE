// src/pages/StakingPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Heading, Text, VStack, Button, Input, InputGroup, InputRightAddon, Spinner, Stat, StatLabel, StatNumber, useToast, SimpleGrid, Divider 
} from '@chakra-ui/react';
import { openContractCall } from '@stacks/connect';
import { uintCV, standardPrincipalCV, FungibleConditionCode, Pc } from '@stacks/transactions';
import { userSession } from '../App';
import { 
  STACKS_NETWORK, DEPLOYER_ADDRESS, STAKING_CONTRACT_ID, ARIA_TOKEN_CONTRACT_ID, TOKEN_DISPLAY, DENOM_DECIMALS 
} from '../constants';
import { readOnlyCall } from '../utils/readOnlyCall';

const StakingPage = ({ address }) => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [balances, setBalances] = useState({ aria: 0, staked: 0, rewards: 0 });
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const toast = useToast();

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const [ariaBal, stakedBal, rewards] = await Promise.all([
        readOnlyCall({
          contractAddress: DEPLOYER_ADDRESS,
          contractName: ARIA_TOKEN_CONTRACT_ID.split('.')[1],
          functionName: 'get-balance',
          functionArgs: [standardPrincipalCV(address)],
          senderAddress: address,
        }),
        readOnlyCall({
          contractAddress: DEPLOYER_ADDRESS,
          contractName: STAKING_CONTRACT_ID.split('.')[1],
          functionName: 'get-staked-balance-for',
          functionArgs: [standardPrincipalCV(address)],
          senderAddress: address,
        }),
        readOnlyCall({
          contractAddress: DEPLOYER_ADDRESS,
          contractName: STAKING_CONTRACT_ID.split('.')[1],
          functionName: 'get-claimable-rewards-for',
          functionArgs: [standardPrincipalCV(address)],
          senderAddress: address,
        })
      ]);

      setBalances({
        aria: parseInt(ariaBal.value),
        staked: parseInt(stakedBal.value),
        rewards: parseInt(rewards.value),
      });
    } catch (e) {
      console.error("Error fetching staking balances:", e);
      toast({ title: "Error", description: "Could not fetch staking data.", status: "error" });
    } finally {
      setLoading(false);
    }
  }, [address, toast]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount) * 10 ** DENOM_DECIMALS;
    if (isNaN(amount) || amount <= 0) return;

    setActionLoading(true);
    const [contractAddress, contractName] = STAKING_CONTRACT_ID.split('.');
    const [tokenContractAddress, tokenContractName] = ARIA_TOKEN_CONTRACT_ID.split('.');

    const postCondition = new Pc.FungiblePostCondition(
      address,
      FungibleConditionCode.Equal,
      amount,
      tokenContractAddress,
      tokenContractName,
      TOKEN_DISPLAY.toLowerCase()
    );

    await openContractCall({
      contractAddress,
      contractName,
      functionName: 'stake',
      functionArgs: [uintCV(amount)],
      network: STACKS_NETWORK,
      userSession,
      postConditions: [postCondition],
      onFinish: () => { toast({ title: "Stake Submitted!", status: "success" }); setTimeout(fetchBalances, 5000); },
      onCancel: () => toast({ title: "Stake Cancelled", status: "info" }),
    });

    setActionLoading(false);
    setStakeAmount('');
  };

  const handleUnstake = async () => {
    const amount = parseFloat(unstakeAmount) * 10 ** DENOM_DECIMALS;
    if (isNaN(amount) || amount <= 0) return;

    setActionLoading(true);
    const [contractAddress, contractName] = STAKING_CONTRACT_ID.split('.');
    const [tokenContractAddress, tokenContractName] = ARIA_TOKEN_CONTRACT_ID.split('.');

    const postCondition = new Pc.FungiblePostCondition(
      contractAddress,
      FungibleConditionCode.Equal,
      amount,
      tokenContractAddress,
      tokenContractName,
      TOKEN_DISPLAY.toLowerCase()
    );

    await openContractCall({
      contractAddress,
      contractName,
      functionName: 'unstake',
      functionArgs: [uintCV(amount)],
      network: STACKS_NETWORK,
      userSession,
      postConditions: [postCondition],
      onFinish: () => { toast({ title: "Unstake Submitted!", status: "success" }); setTimeout(fetchBalances, 5000); },
      onCancel: () => toast({ title: "Unstake Cancelled", status: "info" }),
    });

    setActionLoading(false);
    setUnstakeAmount('');
  };

  const handleClaim = async () => {
    if (balances.rewards <= 0) return;
    setActionLoading(true);
    const [contractAddress, contractName] = STAKING_CONTRACT_ID.split('.');

    const postCondition = new Pc.STXPostCondition(
      contractAddress,
      FungibleConditionCode.Equal,
      balances.rewards
    );

    await openContractCall({
      contractAddress,
      contractName,
      functionName: 'claim-rewards',
      functionArgs: [],
      network: STACKS_NETWORK,
      userSession,
      postConditions: [postCondition],
      onFinish: () => { toast({ title: "Claim Submitted!", status: "success" }); setTimeout(fetchBalances, 5000); },
      onCancel: () => toast({ title: "Claim Cancelled", status: "info" }),
    });

    setActionLoading(false);
  };

  const formatBalance = (val) => (val / 10 ** DENOM_DECIMALS).toLocaleString();

  if (loading) return <VStack><Spinner size="xl" /></VStack>;

  return (
    <Box p={6} shadow="lg" borderWidth="1px" borderRadius="xl" width="100%" bg="gray.800">
      <Heading as="h2" size="lg" mb={6} textAlign="center">ARIA Staking & Rewards</Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} textAlign="center">
        <Stat><StatLabel>Your ARIA Balance</StatLabel><StatNumber>{formatBalance(balances.aria)}</StatNumber></Stat>
        <Stat><StatLabel>Staked ARIA</StatLabel><StatNumber>{formatBalance(balances.staked)}</StatNumber></Stat>
        <Stat><StatLabel>Claimable STX Rewards</StatLabel><StatNumber>{formatBalance(balances.rewards)}</StatNumber></Stat>
      </SimpleGrid>
      
      <Divider my={8} />

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
        <VStack spacing={4}>
          <Heading size="md">Stake Your ARIA</Heading>
          <InputGroup>
            <Input placeholder="Amount to Stake" type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
            <InputRightAddon>{TOKEN_DISPLAY}</InputRightAddon>
          </InputGroup>
          <Button colorScheme="purple" onClick={handleStake} isLoading={actionLoading} isDisabled={!stakeAmount}>Stake</Button>
        </VStack>

        <VStack spacing={4}>
          <Heading size="md">Unstake Your ARIA</Heading>
          <InputGroup>
            <Input placeholder="Amount to Unstake" type="number" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
            <InputRightAddon>{TOKEN_DISPLAY}</InputRightAddon>
          </InputGroup>
          <Button colorScheme="orange" onClick={handleUnstake} isLoading={actionLoading} isDisabled={!unstakeAmount}>Unstake</Button>
        </VStack>
      </SimpleGrid>

      <VStack mt={10}>
        <Button colorScheme="green" size="lg" onClick={handleClaim} isLoading={actionLoading} isDisabled={balances.rewards === 0}>
          Claim {formatBalance(balances.rewards)} STX Rewards
        </Button>
      </VStack>
    </Box>
  );
};

export default StakingPage;
