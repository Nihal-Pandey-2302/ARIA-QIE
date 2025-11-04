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
  Divider,
  Badge,
  Icon,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { Activity, TrendingUp, RefreshCcw } from 'lucide-react';
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
    <Box p={8} maxW="800px" mx="auto">
      <Heading size="lg" mb={4}>🔮 A.R.I.A. Oracle Dashboard</Heading>
      <Text color="gray.400" mb={8}>
        Live data feed and conversion engine powered by the QIE Oracle Network
      </Text>

      {/* LIVE Price Card */}
      <Box
        p={6}
        borderWidth="1px"
        borderRadius="lg"
        bg="gray.800"
        mb={8}
      >
        <HStack justify="space-between" mb={3}>
          <Stat>
            <StatLabel>ARIA/USD</StatLabel>
            <StatNumber>
              {price !== null ? `$${price.toFixed(2)}` : <Spinner size="sm" />}
            </StatNumber>
            <StatHelpText>Live price feed</StatHelpText>
          </Stat>
          <Badge colorScheme="green" variant="subtle" p={2} borderRadius="md">
            <HStack>
              <Icon as={Activity} boxSize={4} />
              <Text fontSize="sm">LIVE</Text>
            </HStack>
          </Badge>
        </HStack>
        <Button
          leftIcon={<RefreshCcw size={16} />}
          colorScheme="purple"
          size="sm"
          onClick={fetchPrice}
        >
          Refresh
        </Button>
      </Box>

      {/* Currency Converter */}
      <Box p={6} borderWidth="1px" borderRadius="lg" bg="gray.800" mb={8}>
        <Heading size="md" mb={4}>💱 Currency Converter</Heading>
        <HStack mb={3}>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            bg="gray.700"
          />
          <Select value={from} onChange={(e) => setFrom(e.target.value)} bg="gray.700">
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="ARIA">ARIA</option>
          </Select>
          <Select value={to} onChange={(e) => setTo(e.target.value)} bg="gray.700">
            <option value="USD">USD</option>
            <option value="INR">INR</option>
            <option value="ARIA">ARIA</option>
          </Select>
          <Button
            colorScheme="purple"
            onClick={handleConvert}
            isLoading={loading}
          >
            Convert
          </Button>
        </HStack>
        {conversion && (
          <Text mt={2}>
            💰 Result: <b>{conversion}</b> {to}
          </Text>
        )}
      </Box>

      {/* Oracle Status */}
      <Box p={6} borderWidth="1px" borderRadius="lg" bg="gray.800">
        <Heading size="md" mb={4}>⚙️ Oracle Status</Heading>
        {status ? (
          <VStack align="start" spacing={1}>
            <Text><b>Provider:</b> {status.provider}</Text>
            <Text><b>Enabled:</b> {status.enabled ? '✅ Active' : '❌ Inactive'}</Text>
            <Text><b>Cache TTL:</b> {status.cacheTTL}s</Text>
            <Text><b>Cache Size:</b> {status.cacheSize}</Text>
            <Text><b>Available Pairs:</b> {status.availablePairs.join(', ')}</Text>
          </VStack>
        ) : (
          <Spinner />
        )}
      </Box>
    </Box>
  );
};

export default OracleDashboard;
