import { useState, useEffect } from 'react';
import { 
  Box, HStack, VStack, Text, Badge, Spinner, Icon, Tooltip 
} from '@chakra-ui/react';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { BACKEND_URL } from '../constants';

/**
 * LivePriceDisplay Component
 * Shows real-time oracle prices with visual indicators
 */
const LivePriceDisplay = ({ tokenId, staticPrice, showMultiCurrency = true }) => {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [trend, setTrend] = useState('stable'); // 'up', 'down', 'stable'

  // Fetch live price from backend
  const fetchLivePrice = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/oracle/nft-price/${tokenId}`);
      if (!response.ok) throw new Error('Failed to fetch price');
      
      const data = await response.json();
      
      // Determine trend
      if (data.currentPrice > staticPrice) {
        setTrend('up');
      } else if (data.currentPrice < staticPrice) {
        setTrend('down');
      } else {
        setTrend('stable');
      }
      
      setPriceData(data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch live price:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePrice();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLivePrice, 30000);
    
    return () => clearInterval(interval);
  }, [tokenId]);

  if (loading) {
    return (
      <Box p={4} bg="gray.700" borderRadius="md">
        <HStack spacing={2}>
          <Spinner size="sm" color="blue.400" />
          <Text fontSize="sm" color="gray.400">Loading live price...</Text>
        </HStack>
      </Box>
    );
  }

  if (!priceData) {
    return (
      <Box p={4} bg="gray.700" borderRadius="md">
        <Text fontSize="sm" color="gray.400">
          Oracle price unavailable. Showing static price: {staticPrice} ARIA
        </Text>
      </Box>
    );
  }

  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return Activity;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'green.400';
    if (trend === 'down') return 'red.400';
    return 'blue.400';
  };

  const priceChange = ((priceData.currentPrice - staticPrice) / staticPrice * 100).toFixed(2);
  const showChange = Math.abs(priceChange) > 0.01;

  return (
    <VStack spacing={3} align="stretch" w="100%">
      {/* Main Live Price Display */}
      <Box 
        p={4} 
        bg="gray.800" 
        borderRadius="lg" 
        borderWidth="2px"
        borderColor={getTrendColor()}
        position="relative"
        overflow="hidden"
      >
        {/* Animated Background Effect */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg={`linear-gradient(135deg, transparent 0%, ${getTrendColor()} 100%)`}
          opacity={0.05}
          pointerEvents="none"
        />

        <VStack spacing={2} position="relative">
          <HStack justify="space-between" w="100%">
            <HStack spacing={2}>
              <Badge colorScheme="purple" variant="solid" fontSize="xs">
                <HStack spacing={1}>
                  <Activity size={10} />
                  <Text>LIVE PRICE</Text>
                </HStack>
              </Badge>
              
              {priceData.oracleEnabled && (
                <Tooltip label="Powered by QIE Oracle Network">
                  <Badge colorScheme="blue" variant="outline" fontSize="xs">
                    🔮 Oracle
                  </Badge>
                </Tooltip>
              )}
            </HStack>

            <Tooltip label={`Last updated: ${lastUpdate?.toLocaleTimeString()}`}>
              <Icon as={RefreshCw} boxSize={4} color="gray.400" cursor="pointer" />
            </Tooltip>
          </HStack>

          <HStack justify="space-between" w="100%" align="flex-end">
            <VStack align="flex-start" spacing={0}>
              <Text fontSize="xs" color="gray.400">Current Price</Text>
              <HStack spacing={2} align="baseline">
                <Text fontSize="2xl" fontWeight="bold" color={getTrendColor()}>
                  {priceData.currentPrice?.toFixed(2) || staticPrice}
                </Text>
                <Text fontSize="sm" color="gray.400">ARIA</Text>
              </HStack>
            </VStack>

            {showChange && (
              <VStack align="flex-end" spacing={0}>
                <HStack spacing={1}>
                  <Icon 
                    as={getTrendIcon()} 
                    boxSize={4} 
                    color={getTrendColor()} 
                  />
                  <Text 
                    fontSize="sm" 
                    fontWeight="bold" 
                    color={getTrendColor()}
                  >
                    {priceChange > 0 ? '+' : ''}{priceChange}%
                  </Text>
                </HStack>
                <Text fontSize="xs" color="gray.500">vs static</Text>
              </VStack>
            )}
          </HStack>

          {priceData.staticPrice !== priceData.currentPrice && (
            <Box w="100%" pt={2} borderTopWidth="1px" borderColor="gray.700">
              <HStack justify="space-between" w="100%">
                <Text fontSize="xs" color="gray.500">Static Price:</Text>
                <Text fontSize="xs" color="gray.400">
                  {priceData.staticPrice?.toFixed(2)} ARIA
                </Text>
              </HStack>
            </Box>
          )}
        </VStack>
      </Box>

      {/* Multi-Currency Display */}
      {showMultiCurrency && priceData.prices && (
        <Box p={3} bg="gray.700" borderRadius="md">
          <Text fontSize="xs" color="gray.400" mb={2} fontWeight="semibold">
            💱 Price in Other Currencies
          </Text>
          <VStack spacing={1} align="stretch">
            {priceData.prices.USD && (
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.500">USD:</Text>
                <Text fontSize="sm" color="green.300" fontWeight="medium">
                  ${priceData.prices.USD.toFixed(2)}
                </Text>
              </HStack>
            )}
            {priceData.prices.INR && (
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.500">INR:</Text>
                <Text fontSize="sm" color="orange.300" fontWeight="medium">
                  ₹{priceData.prices.INR.toFixed(2)}
                </Text>
              </HStack>
            )}
            {priceData.prices.ETH && (
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.500">ETH:</Text>
                <Text fontSize="sm" color="blue.300" fontWeight="medium">
                  {priceData.prices.ETH.toFixed(6)} ETH
                </Text>
              </HStack>
            )}
          </VStack>
        </Box>
      )}

      {/* Oracle Info */}
      {priceData.oracleTimestamp && (
        <Box p={2} bg="gray.900" borderRadius="md">
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Oracle last updated: {new Date(priceData.oracleTimestamp * 1000).toLocaleString()}
          </Text>
        </Box>
      )}
    </VStack>
  );
};

export default LivePriceDisplay;