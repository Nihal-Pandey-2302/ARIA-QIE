// src/components/Navbar.jsx
import { NavLink } from 'react-router-dom';
import { HStack, Link, useColorModeValue, Text, Tooltip } from '@chakra-ui/react';

const Navbar = () => {
  const activeLinkColor = useColorModeValue("purple.500", "purple.200");
  const inactiveLinkColor = useColorModeValue("gray.600", "gray.400");
  const futureLinkColor = useColorModeValue("gray.400", "gray.600");

  const activeStyle = {
    fontWeight: 'bold',
    color: activeLinkColor,
    textDecoration: 'underline',
  };

  return (
    <HStack as="nav" spacing={8} justify="center" mb={8} fontSize="lg">
      <Link as={NavLink} to="/" style={({ isActive }) => isActive ? activeStyle : undefined} color={inactiveLinkColor}>
        Mint RWA
      </Link>
      <Link as={NavLink} to="/marketplace" style={({ isActive }) => isActive ? activeStyle : undefined} color={inactiveLinkColor}>
        Marketplace
      </Link>
      <Link as={NavLink} to="/staking" style={({ isActive }) => isActive ? activeStyle : undefined} color={inactiveLinkColor}>
        Staking
      </Link>
      <Tooltip label="Coming Soon!" placement="bottom" hasArrow>
        <Text
          color={futureLinkColor}
          cursor="not-allowed"
          _hover={{ textDecoration: 'none' }}
        >
          Governance
        </Text>
      </Tooltip>
    </HStack>
  );
};

export default Navbar;