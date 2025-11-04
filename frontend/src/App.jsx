import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, VStack, Heading, useToast } from '@chakra-ui/react';
import { ethers } from 'ethers';

// Page Imports
import HomePage from './pages/HomePage';
import StakingPage from './pages/StakingPage';
import MarketplacePage from './pages/MarketplacePage';
import MintAriaPage from './pages/MintAriaPage'; // ← Added
import OracleDashboard from './pages/OracleDashboard';
// Component Imports
import Header from './components/Header';
import Navbar from './components/Navbar';
import { NETWORK_CONFIG } from './constants';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Switch to Hardhat Local Network
  const switchToHardhatNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG],
          });
        } catch (addError) {
          console.error("Failed to add network", addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  };

  // Connect Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      return toast({
        title: "Wallet not detected!",
        description: "Please install MetaMask or QIE Wallet.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }

    try {
      setLoading(true);
      await switchToHardhatNetwork();

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const userAddress = await web3Signer.getAddress();

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(userAddress);

      toast({
        title: "Wallet Connected",
        description: `Connected as ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

    } catch (err) {
      console.error("Wallet connection error:", err);
      toast({
        title: "Wallet connection failed",
        description: err.message || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    toast({
      title: "Wallet Disconnected",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  // Handle account / chain changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) connectWallet();
        else disconnect();
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  return (
    <Container maxW="container.xl" py={4} className="app-container">
      <VStack spacing={6} align="stretch">
        <Header
          address={account}
          loading={loading}
          onConnect={connectWallet}
          onDisconnect={disconnect}
        />
        <Navbar />
        <Routes>
          <Route 
            path="/" 
            element={<HomePage address={account} provider={provider} signer={signer} />} 
          />
          <Route
            path="/marketplace"
            element={
              account ? (
                <MarketplacePage address={account} provider={provider} account={account} />
              ) : (
                <VStack spacing={4} py={8}>
                  <Heading size="md" textAlign="center">
                    Please connect your wallet to view the marketplace.
                  </Heading>
                </VStack>
              )
            }
          />
          <Route
            path="/staking"
            element={
              account ? (
                <StakingPage address={account} signer={signer} />
              ) : (
                <VStack spacing={4} py={8}>
                  <Heading size="md" textAlign="center">
                    Please connect your wallet to manage staking.
                  </Heading>
                </VStack>
              )
            }
          />
          <Route
            path="/mint-aria"
            element={
              account ? (
                <MintAriaPage provider={provider} account={account} />
              ) : (
                <VStack spacing={4} py={8}>
                  <Heading size="md" textAlign="center">
                    Please connect your wallet to mint ARIA tokens.
                  </Heading>
                </VStack>
              )
            }
          />
          <Route path="/oracle" element={<OracleDashboard />} />
        </Routes>
      </VStack>
    </Container>
  );
}

export default App;

