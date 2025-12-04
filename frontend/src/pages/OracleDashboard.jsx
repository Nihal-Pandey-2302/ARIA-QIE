import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Select,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Icon,
  Spinner,
  useToast,
  Container,
  Flex,
  Tooltip
} from '@chakra-ui/react';
import { Activity, TrendingUp, RefreshCcw, DollarSign, Globe, Database, Server, Zap } from 'lucide-react';
import { BACKEND_URL } from '../constants';

const OracleDashboard = () => {
  const [status, setStatus] = useState(null);
  const [price, setPrice] = useState(null);
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState('INR');
  const [to, setTo] = useState('USD');
  const toast = useToast();

  // Fetch Oracle status
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/oracle/status`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Status error:', err);
    }
  };

  // Fetch ARIA price
  const fetchPrice = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/oracle/price/ARIA/USD`);
      const data = await res.json();
      setPrice(data.price);
    } catch (err) {
      console.error('Price error:', err);
    }
  };

  // Convert currency using oracle
  const handleConvert = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/oracle/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), from, to }),
      });
      const data = await res.json();
      if (data.result) {
        setConversion(data.result);
      } else {
        toast({
          title: 'Conversion failed',
          description: data.error || 'Unsupported pair',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('Conversion error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        {/* Header Section */}
        <Box textAlign="center" mb={4}>
          <Badge colorScheme="purple" mb={2} px={3} py={1} borderRadius="full">
            <HStack spacing={1}>
              <Icon as={Zap} size={12} />
              <Text fontSize="xs" fontWeight="bold">POWERED BY QIE NETWORK</Text>
            </HStack>
          </Badge>
          <Heading size="2xl" bgGradient="linear(to-r, purple.400, blue.400)" bgClip="text" mb={2}>
            Oracle Command Center
          </Heading>
          <Text fontSize="lg" color="gray.400" maxW="2xl" mx="auto">
            Real-time price feeds, currency conversion, and network status monitoring for the A.R.I.A. ecosystem.
          </Text>
        </Box>

        {/* Main Grid */}
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
          
          {/* 1. Live Price Feed Card */}
          <Card bg="gray.800" borderColor="purple.500" borderWidth="1px" boxShadow="0 0 20px rgba(128, 90, 213, 0.15)">
            <CardHeader pb={0}>
              <Flex justify="space-between" align="center">
                <HStack>
                  <Icon as={Activity} color="purple.400" />
                  <Heading size="md">Live Feed</Heading>
                </HStack>
                <Badge colorScheme="green" variant="solid" px={2} borderRadius="md">
                  ACTIVE
                </Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Stat>
                  <StatLabel color="gray.400">ARIA / USD</StatLabel>
                  <StatNumber fontSize="4xl" fontWeight="bold">
                    {price != null && !isNaN(price) ? `$${Number(price).toFixed(2)}` : <Spinner size="sm" color="purple.500" />}
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    Updated just now
                  </StatHelpText>
                </Stat>
                <Divider borderColor="gray.700" />
                <HStack justify="space-between" fontSize="sm" color="gray.400">
                  <Text>Source: QIE Oracle</Text>
                  <Text>Confidence: 100%</Text>
                </HStack>
                <Button
                  leftIcon={<RefreshCcw size={16} />}
                  colorScheme="purple"
                  variant="outline"
                  size="sm"
                  onClick={fetchPrice}
                  _hover={{ bg: "purple.900" }}
                >
                  Force Refresh
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* 2. Currency Converter Card */}
          <Card bg="gray.800" borderColor="gray.700" borderWidth="1px">
            <CardHeader pb={0}>
              <HStack>
                <Icon as={DollarSign} color="green.400" />
                <Heading size="md">Converter</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  size="lg"
                  bg="gray.900"
                  border="none"
                  _focus={{ ring: 2, ringColor: "purple.500" }}
                />
                <HStack width="100%">
                  <Select value={from} onChange={(e) => setFrom(e.target.value)} bg="gray.700" size="lg">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="ARIA">ARIA</option>
                    <option value="ETH">ETH</option>
                  </Select>
                  <Icon as={TrendingUp} color="gray.500" />
                  <Select value={to} onChange={(e) => setTo(e.target.value)} bg="gray.700" size="lg">
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="ARIA">ARIA</option>
                    <option value="ETH">ETH</option>
                  </Select>
                </HStack>
                <Button
                  colorScheme="green"
                  width="100%"
                  size="lg"
                  onClick={handleConvert}
                  isLoading={loading}
                  loadingText="Calculating..."
                >
                  Convert Value
                </Button>
                {conversion && (
                  <Box width="100%" p={3} bg="green.900" borderRadius="md" textAlign="center">
                    <Text fontSize="sm" color="green.200">Result</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="white">
                      {Number(conversion).toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}
                    </Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* 3. System Status Card */}
          <Card bg="gray.800" borderColor="gray.700" borderWidth="1px">
            <CardHeader pb={0}>
              <HStack>
                <Icon as={Server} color="blue.400" />
                <Heading size="md">System Status</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              {status ? (
                <VStack align="stretch" spacing={4}>
                  <HStack justify="space-between">
                    <Text color="gray.400">Provider</Text>
                    <Badge colorScheme="blue">{status.provider}</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.400">Operational</Text>
                    <Badge colorScheme={status.enabled ? "green" : "red"}>
                      {status.enabled ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.400">Cache TTL</Text>
                    <Text fontWeight="bold">{status.cacheTTL}s</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.400">Cached Pairs</Text>
                    <Text fontWeight="bold">{status.cacheSize}</Text>
                  </HStack>
                  <Box pt={2}>
                    <Text fontSize="xs" color="gray.500" mb={2}>SUPPORTED PAIRS</Text>
                    <Flex gap={2} flexWrap="wrap">
                      {status.availablePairs.map(pair => (
                        <Badge key={pair} variant="outline" colorScheme="gray">{pair}</Badge>
                      ))}
                    </Flex>
                  </Box>
                </VStack>
              ) : (
                <Flex justify="center" align="center" height="200px">
                  <Spinner size="xl" color="blue.500" />
                </Flex>
              )}
            </CardBody>
          </Card>

        </SimpleGrid>
      </VStack>
    </Container>
  );
};

export default OracleDashboard;
