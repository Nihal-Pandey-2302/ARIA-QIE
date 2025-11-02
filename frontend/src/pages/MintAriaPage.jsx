import { useState, useEffect } from "react";
import { VStack, Text, Input, Button, useToast } from "@chakra-ui/react";
import { ethers } from "ethers";
import { ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, TOKEN_DECIMALS } from "../constants";

const MintAriaPage = ({ provider, account }) => {
  const [ethAmount, setEthAmount] = useState("");
  const [ariaBalance, setAriaBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchBalance = async () => {
    if (!provider || !account) return;
    try {
      const ariaToken = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, provider);
      const balance = await ariaToken.balanceOf(account);
      setAriaBalance(Number(balance) / 10 ** TOKEN_DECIMALS);
    } catch (err) {
      console.error("Failed to fetch ARIA balance", err);
    }
  };

  const handleMint = async () => {
    if (!provider || !account) return;
    if (!ethAmount || Number(ethAmount) <= 0) return;

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const ariaToken = new ethers.Contract(ARIA_TOKEN_ADDRESS, ARIA_TOKEN_ABI, signer);

      const tx = await ariaToken.mintFromETH({
        value: ethers.parseEther(ethAmount)
      });

      await tx.wait();

      toast({
        title: "ARIA Minted",
        description: `You received ARIA tokens for ${ethAmount} ETH`,
        status: "success",
        duration: 5000,
        isClosable: true
      });

      setEthAmount("");
      fetchBalance(); // fetch updated balance
    } catch (err) {
      console.error(err);
      toast({
        title: "Minting failed",
        description: err.message || "See console",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [provider, account]);

  return (
    <VStack spacing={4} py={10}>
      <Text fontSize="lg">Mint ARIA Tokens</Text>
      <Text>Your ARIA Balance: {ariaBalance.toFixed(2)}</Text>
      <Input
        placeholder="ETH amount"
        value={ethAmount}
        onChange={(e) => setEthAmount(e.target.value)}
        type="number"
      />
      <Button colorScheme="purple" onClick={handleMint} isLoading={loading}>
        Mint ARIA
      </Button>
    </VStack>
  );
};

export default MintAriaPage;
