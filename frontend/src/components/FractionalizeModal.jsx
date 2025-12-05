// src/components/FractionalizeModal.jsx
import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Input,
  FormControl,
  FormLabel,
  Text,
  Alert,
  AlertIcon,
  Progress,
  Badge,
  Box,
  useToast,
  InputGroup,
  InputRightAddon,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { ethers } from "ethers";
import {
  FRACTIONAL_NFT_ADDRESS,
  FRACTIONAL_NFT_ABI,
  ARIA_NFT_ADDRESS,
  BACKEND_URL,
} from "../constants";

// 1. ADD NEW ICONS
import { AddIcon, CopyIcon, ExternalLinkIcon } from "@chakra-ui/icons";

const FractionalizeModal = ({
  isOpen,
  onClose,
  tokenId,
  tokenName,
  signer,
}) => {
  const [tokenSupply, setTokenSupply] = useState("");
  const [fractionName, setFractionName] = useState("");
  const [fractionSymbol, setFractionSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Approving, 3: Creating, 4: Success
  const [result, setResult] = useState(null);
  const toast = useToast();

  // ... (generateDefaults, handleOpen, validateInputs functions are unchanged) ...

  const generateDefaults = () => {
    if (!tokenId) return;

    const baseName = tokenName || `RWA NFT #${tokenId}`;
    const defaultName = `Fractional ${baseName}`;
    const defaultSymbol = `F${tokenId}`;

    setFractionName(defaultName);
    setFractionSymbol(defaultSymbol);
    setTokenSupply("10000"); // Default 10,000 tokens
  };

  const handleOpen = () => {
    generateDefaults();
    setStep(1);
    setResult(null);
  };

  const validateInputs = () => {
    if (!tokenSupply || parseInt(tokenSupply) <= 0) {
      toast({
        title: "Invalid token supply",
        description: "Supply must be a positive number",
        status: "error",
        duration: 3000,
      });
      return false;
    }

    if (!fractionName || !fractionSymbol) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        status: "error",
        duration: 3000,
      });
      return false;
    }

    if (fractionSymbol.length > 10) {
      toast({
        title: "Symbol too long",
        description: "Symbol must be 10 characters or less",
        status: "error",
        duration: 3000,
      });
      return false;
    }

    return true;
  };

  const handleFractionalize = async () => {
    if (!validateInputs()) return;
    if (!signer) {
      toast({
        title: "Wallet not connected",
        status: "error",
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // const { userAddress } = useWallet(); signer.getAddress();

      // Step 1: Approve FractionalNFT contract to transfer NFT
      setStep(2);
      toast({
        title: "Step 1/2: Approving NFT transfer",
        status: "info",
        duration: null,
        isClosable: false,
      });

      const nftContract = new ethers.Contract(
        ARIA_NFT_ADDRESS,
        ["function approve(address to, uint256 tokenId)"],
        signer
      );

      const approveTx = await nftContract.approve(
        FRACTIONAL_NFT_ADDRESS,
        tokenId
      );
      await approveTx.wait();

      toast.closeAll();

      // Step 2: Fractionalize NFT
      setStep(3);
      toast({
        title: "Step 2/2: Creating fractional tokens",
        status: "info",
        duration: null,
        isClosable: false,
      });

      const fractionalContract = new ethers.Contract(
        FRACTIONAL_NFT_ADDRESS,
        FRACTIONAL_NFT_ABI,
        signer
      );

      // Your contract mints 10**decimals() automatically, so parse just the base supply
      const supplyInBaseUnits = ethers.parseUnits(tokenSupply, 0); // e.g., 10000

      const tx = await fractionalContract.fractionalizeNFT(
        ARIA_NFT_ADDRESS,
        tokenId,
        supplyInBaseUnits, // Send the base number (e.g., 10000)
        fractionName,
        fractionSymbol
      );

      const receipt = await tx.wait();

      // Parse event to get fractional ID and token address
      let fractionalId = null;
      let tokenAddress = null;

      for (const log of receipt.logs) {
        try {
          const parsed = fractionalContract.interface.parseLog(log);
          if (parsed.name === "AssetFractionalized") {
            fractionalId = parsed.args.fractionalId.toString();
            tokenAddress = parsed.args.fractionToken;
            break;
          }
        } catch (e) {
          console.debug("Skipping log:", e.message);
        }
      }

      toast.closeAll();

      // Success!
      setStep(4);
      setResult({
        fractionalId,
        tokenAddress,
        txHash: receipt.hash,
        tokenName: fractionName,
        tokenSymbol: fractionSymbol,
        totalSupply: tokenSupply, // Store the base supply for display
      });

      toast({
        title: "Fractionalization Successful! 🎉",
        description: `Created ${tokenSupply} ${fractionSymbol} tokens`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Fractionalization error:", error);
      toast.closeAll();

      let errorMsg = "Transaction failed";
      if (error.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast({
        title: "Fractionalization Failed",
        description: errorMsg,
        status: "error",
        duration: 7000,
        isClosable: true,
      });

      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // Close and reset
  const handleClose = () => {
    setStep(1);
    setResult(null);
    setLoading(false);
    onClose();
  };

  // 2. ADD THE "ADD TO WALLET" HANDLER
  const handleAddToWallet = async () => {
    if (!signer || !result?.tokenAddress) return;

    // The FractionToken.sol uses standard ERC20 decimals, which is 18
    const tokenDecimals = 18;

    try {
      // 'wallet_watchAsset' is the method for MetaMask and other compatible wallets
      const success = await signer.provider.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: result.tokenAddress,
            symbol: result.tokenSymbol,
            decimals: tokenDecimals,
            // image: 'https://your-domain/token-logo.png', // Optional image
          },
        },
      });

      if (success) {
        toast({
          title: "Token Added!",
          description: `${result.tokenSymbol} has been added to your wallet.`,
          status: "success",
          duration: 3000,
        });
      } else {
        throw new Error("Wallet rejected the request");
      }
    } catch (error) {
      console.error("Failed to add token to wallet:", error);
      toast({
        title: "Failed to add token",
        description: error.message || "Could not add token to wallet.",
        status: "error",
        duration: 5000,
      });
    }
  };

  // 3. COPY ADDRESS HANDLER
  const handleCopyAddress = () => {
    if (result?.tokenAddress) {
      navigator.clipboard.writeText(result.tokenAddress);
      toast({
        title: "Address Copied!",
        status: "success",
        duration: 2000,
        size: "sm",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      // 3. FIX: Move onOpen prop to Modal, not onOpen to the element
      // This ensures generateDefaults() runs when the modal opens
      onModalOpen={handleOpen}
    >
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent bg="gray.800" borderWidth="2px" borderColor="purple.500">
        <ModalHeader>
          <HStack>
            <Text>🪙 Fractionalize NFT #{tokenId}</Text>
            {step > 1 && (
              <Badge colorScheme="purple" ml={2}>
                Step {step}/4
              </Badge>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton isDisabled={loading} />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Info Box */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontSize="sm" fontWeight="bold">
                  Turn your NFT into tradeable tokens
                </Text>
                <Text fontSize="xs" color="gray.300">
                  Your NFT will be locked in escrow and fractional tokens will
                  be created. You can redeem the NFT by burning all tokens.
                </Text>
              </VStack>
            </Alert>

            {step === 1 && (
              <>
                {/* Token Supply */}
                <FormControl>
                  <FormLabel fontSize="sm">Total Supply</FormLabel>
                  <InputGroup>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={tokenSupply}
                      onChange={(e) => setTokenSupply(e.target.value)}
                      min="1"
                    />
                    <InputRightAddon>tokens</InputRightAddon>
                  </InputGroup>
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    Number of fractional tokens to create (e.g., 10000)
                  </Text>
                </FormControl>

                {/* Token Name */}
                <FormControl>
                  <FormLabel fontSize="sm">Token Name</FormLabel>
                  <Input
                    placeholder="Fractional RWA NFT #1"
                    value={fractionName}
                    onChange={(e) => setFractionName(e.target.value)}
                  />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    Full name for the fractional token
                  </Text>
                </FormControl>

                {/* Token Symbol */}
                <FormControl>
                  <FormLabel fontSize="sm">Token Symbol</FormLabel>
                  <Input
                    placeholder="F1"
                    value={fractionSymbol}
                    onChange={(e) =>
                      setFractionSymbol(e.target.value.toUpperCase())
                    }
                    maxLength={10}
                  />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    Short symbol (max 10 characters)
                  </Text>
                </FormControl>

                {/* Preview */}
                {tokenSupply && fractionSymbol && (
                  <Box
                    p={4}
                    bg="purple.900"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="purple.600"
                  >
                    <Text fontSize="xs" color="gray.400" mb={2}>
                      Preview:
                    </Text>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="bold">
                          {fractionName}
                        </Text>
                        <Badge colorScheme="purple">{fractionSymbol}</Badge>
                      </VStack>
                      <VStack align="end" spacing={1}>
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          color="purple.300"
                        >
                          {parseInt(tokenSupply || 0).toLocaleString()}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          Total Supply
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )}
              </>
            )}

            {step === 2 && (
              <VStack spacing={4}>
                <Text fontSize="lg" fontWeight="bold">
                  Approving NFT Transfer...
                </Text>
                <Progress isIndeterminate colorScheme="purple" w="100%" />
                <Text fontSize="sm" color="gray.400">
                  Please confirm the approval transaction in your wallet
                </Text>
              </VStack>
            )}

            {step === 3 && (
              <VStack spacing={4}>
                <Text fontSize="lg" fontWeight="bold">
                  Creating Fractional Tokens...
                </Text>
                <Progress isIndeterminate colorScheme="purple" w="100%" />
                <Text fontSize="sm" color="gray.400">
                  Your NFT is being fractionalized on QIE Blockchain
                </Text>
              </VStack>
            )}

            {step === 4 && result && (
              <VStack spacing={4} align="stretch">
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Successfully created{" "}
                    {parseInt(result.totalSupply).toLocaleString()} fractional
                    tokens!
                  </Text>
                </Alert>

                <Box p={4} bg="gray.700" borderRadius="md">
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.400">
                        Token Name:
                      </Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {result.tokenName}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.400">
                        Symbol:
                      </Text>
                      <Badge colorScheme="purple">{result.tokenSymbol}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.400">
                        Total Supply:
                      </Text>
                      <Text fontSize="sm">
                        {parseInt(result.totalSupply).toLocaleString()}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.400">
                        Token Address:
                      </Text>
                      <HStack>
                        <Text fontSize="xs" fontFamily="mono" color="cyan.300">
                          {result.tokenAddress?.slice(0, 6)}...
                          {result.tokenAddress?.slice(-4)}
                        </Text>
                        <Tooltip label="Copy Address">
                          <IconButton
                            icon={<CopyIcon />}
                            size="xs"
                            variant="ghost"
                            colorScheme="cyan"
                            onClick={handleCopyAddress}
                            aria-label="Copy address"
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>
                  </VStack>
                </Box>

                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontSize="sm" fontWeight="bold">
                      🎯 Next Steps:
                    </Text>
                    <Text fontSize="xs" color="gray.300">
                      1. Add token to your wallet (click button below)
                      <br />
                      2. Create liquidity pool on QIEDEX to enable trading
                    </Text>
                  </VStack>
                </Alert>

                {/* 4. WRAP BUTTONS IN HSTACK FOR SIDE-BY-SIDE LAYOUT */}
                <VStack spacing={3}>
                  <HStack spacing={4} width="100%">
                    <Button
                      colorScheme="blue"
                      variant="outline"
                      onClick={handleAddToWallet}
                      size="sm"
                      leftIcon={<AddIcon />}
                      flex={1}
                    >
                      Add to Wallet
                    </Button>

                    <Button
                      colorScheme="purple"
                      as="a"
                      href={`https://dex.qie.digital/pool/create?token=${result.tokenAddress}`}
                      target="_blank"
                      size="sm"
                      rightIcon={<ExternalLinkIcon />}
                      flex={1}
                    >
                      Create Pool on QIEDEX
                    </Button>
                  </HStack>

                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    (Opens QIEDEX in a new tab)
                  </Text>
                </VStack>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} width="100%">
            {step === 1 && (
              <>
                <Button variant="ghost" onClick={handleClose} flex={1}>
                  Cancel
                </Button>
                <Button
                  colorScheme="purple"
                  onClick={handleFractionalize}
                  isLoading={loading}
                  isDisabled={!tokenSupply || !fractionName || !fractionSymbol}
                  flex={1}
                >
                  Fractionalize
                </Button>
              </>
            )}

            {step === 4 && (
              <Button colorScheme="green" onClick={handleClose} width="100%">
                Done
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FractionalizeModal;
