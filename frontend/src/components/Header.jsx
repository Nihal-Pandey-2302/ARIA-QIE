// src/components/Header.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Badge,
  Tooltip,
  useClipboard,
  useToast
} from '@chakra-ui/react';
import { FaWallet, FaCopy, FaSignOutAlt } from 'react-icons/fa';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { Activity, TrendingUp } from 'lucide-react';
import { BACKEND_URL } from '../constants';

const Header = ({ address, loading, onConnect, onDisconnect }) => {
  const { onCopy, hasCopied } = useClipboard(address || '');
  const toast = useToast();
  const [oraclePrice, setOraclePrice] = useState(null);
  const [oracleStatus, setOracleStatus] = useState('checking');

  // Fetch ARIA price from oracle
  const fetchOraclePrice = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/oracle/price/ARIA/USD`);
      if (response.ok) {
        const data = await response.json();
        setOraclePrice(data.price);
        setOracleStatus('active');
      } else {
        setOracleStatus('inactive');
      }
    } catch (err) {
      setOracleStatus('inactive');
      console.error('Oracle fetch error:', err);
    }
  };

  useEffect(() => {
    fetchOraclePrice();
    // Refresh every 30 seconds
    const interval = setInterval(fetchOraclePrice, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    onCopy();
    toast({
      title: "Address Copied!",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Flex
      as="header"
      width="100%"
      p={4}
      alignItems="center"
      justifyContent="space-between"
      borderBottomWidth="1px"
      borderColor="gray.700"
      mb={6}
      flexWrap="wrap"
      gap={3}
    >
      {/* Logo and Title */}
      <HStack spacing={3}>
        <Heading as="h1" size="lg" bgGradient="linear(to-r, purple.400, pink.400)" bgClip="text">
          A.R.I.A.
        </Heading>
        
        {/* Oracle Status Badge */}
        {oracleStatus === 'active' && oraclePrice && (
          <Tooltip label="Live price from QIE Oracle Network" placement="bottom">
            <Badge 
              colorScheme="green" 
              variant="subtle" 
              px={3} 
              py={1} 
              borderRadius="full"
              fontSize="xs"
              display={{ base: 'none', md: 'flex' }}
              alignItems="center"
              gap={2}
            >
              <Icon as={Activity} boxSize={3} />
              <Text>LIVE</Text>
              <Icon as={TrendingUp} boxSize={3} />
              <Text fontWeight="bold">${oraclePrice?.toFixed(2)}</Text>
              <Text color="gray.400">/ARIA</Text>
            </Badge>
          </Tooltip>
        )}
      </HStack>

      {/* Wallet Connection */}
      <HStack spacing={3}>
        {/* Mobile: Show compact oracle price */}
        {oracleStatus === 'active' && oraclePrice && (
          <Box display={{ base: 'block', md: 'none' }}>
            <Tooltip label="Live ARIA price">
              <Badge colorScheme="green" variant="solid" fontSize="xs">
                ${oraclePrice?.toFixed(2)}
              </Badge>
            </Tooltip>
          </Box>
        )}

        {address ? (
          <Menu>
            <MenuButton 
              as={Button} 
              colorScheme="purple" 
              variant="solid" 
              rightIcon={<ChevronDownIcon />}
              size={{ base: 'sm', md: 'md' }}
            >
              <HStack spacing={2}>
                <Icon as={FaWallet} />
                <Text fontSize="sm">
                  {address.substring(0, 6)}...{address.substring(address.length - 4)}
                </Text>
              </HStack>
            </MenuButton>
            <MenuList bg="gray.800" borderColor="gray.600">
              <MenuItem icon={<FaCopy />} onClick={handleCopy} bg="gray.800" _hover={{ bg: 'gray.700' }}>
                {hasCopied ? "✅ Copied!" : "Copy Address"}
              </MenuItem>
              <MenuItem icon={<FaSignOutAlt />} onClick={onDisconnect} bg="gray.800" _hover={{ bg: 'gray.700' }}>
                Disconnect
              </MenuItem>
            </MenuList>
          </Menu>
        ) : (
          <Button
            onClick={onConnect}
            isLoading={loading}
            colorScheme="purple"
            leftIcon={<FaWallet />}
            size={{ base: 'sm', md: 'md' }}
          >
            Connect Wallet
          </Button>
        )}
      </HStack>
    </Flex>
  );
};

export default Header;