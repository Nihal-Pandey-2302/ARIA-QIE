// src/components/Header.jsx

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
  useClipboard,
  useToast
} from '@chakra-ui/react';
import { FaWallet, FaCheckCircle, FaCopy, FaSignOutAlt } from 'react-icons/fa';
import { ChevronDownIcon } from '@chakra-ui/icons';

const Header = ({ address, loading, onConnect, onDisconnect }) => {
  const { onCopy, hasCopied } = useClipboard(address || '');
  const toast = useToast();

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
    >
      <Heading as="h1" size="lg">
        A.R.I.A.
      </Heading>

      {address ? (
        <Menu>
          <MenuButton 
            as={Button} 
            colorScheme="purple" 
            variant="solid" 
            rightIcon={<ChevronDownIcon />}
          >
            <HStack>
              <Icon as={FaWallet} />
              <Text fontSize="sm">
                {address.substring(0, 6)}...{address.substring(address.length - 6)}
              </Text>
            </HStack>
          </MenuButton>
          <MenuList bg="gray.800" borderColor="gray.600">
            <MenuItem icon={<FaCopy />} onClick={handleCopy} bg="gray.800">
              {hasCopied ? "Copied!" : "Copy Address"}
            </MenuItem>
            <MenuItem icon={<FaSignOutAlt />} onClick={onDisconnect} bg="gray.800">
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
        >
          Connect Wallet
        </Button>
      )}
    </Flex>
  );
};

export default Header;