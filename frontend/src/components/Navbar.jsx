// src/components/Navbar.jsx
import { NavLink } from 'react-router-dom';
import { HStack, Link, useColorModeValue, Text, Tooltip, Icon } from '@chakra-ui/react';
// Import an icon
import { Activity } from 'lucide-react';

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
      <Link as={NavLink} to="/mint-aria" style={({ isActive }) => isActive ? activeStyle : undefined} color={inactiveLinkColor}>
        Mint ARIA
      </Link>

      {/* ADD THE NEW ORACLE LINK */}
      <Link as={NavLink} to="/oracle" style={({ isActive }) => isActive ? activeStyle : undefined} color={inactiveLinkColor}>
        <HStack spacing={1}>
          <Icon as={Activity} boxSize={4} />
          <Text>Oracle</Text>
        </HStack>
      </Link>
      
      <Link as={NavLink} to="/governance" style={({ isActive }) => isActive ? activeStyle : undefined} color={inactiveLinkColor}>
        Governance
      </Link>
    </HStack>
  );
};

export default Navbar;