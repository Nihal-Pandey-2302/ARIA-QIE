// src/components/AIReportCard.jsx - ENHANCED WITH DOCUMENT TYPE DISPLAY
import { 
  Box, VStack, HStack, Text, Badge, Progress, Link, 
  SimpleGrid, Divider, Icon, Tooltip 
} from '@chakra-ui/react';
import { ExternalLinkIcon, CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { FiShield, FiTrendingUp } from 'react-icons/fi';

const DOCUMENT_TYPE_INFO = {
  invoice: { icon: "💰", name: "Invoice", color: "purple" },
  property_deed: { icon: "🏠", name: "Property Deed", color: "blue" },
  vehicle_registration: { icon: "🚗", name: "Vehicle Registration", color: "orange" },
  certificate: { icon: "🎓", name: "Certificate", color: "green" },
  supply_chain: { icon: "📦", name: "Supply Chain", color: "cyan" },
  medical_record: { icon: "⚕️", name: "Medical Record", color: "red" },
  legal_contract: { icon: "📜", name: "Legal Contract", color: "gray" },
  insurance_policy: { icon: "🛡️", name: "Insurance", color: "teal" }
};

const AIReportCard = ({ report, ipfsLink }) => {
  if (!report) return null;

  const docType = report.document_type || 'invoice';
  const docInfo = DOCUMENT_TYPE_INFO[docType] || DOCUMENT_TYPE_INFO.invoice;
  
  const authenticityScore = report.authenticity_score || 0;
  const confidence = report.confidence || 0;
  const extractedData = report.extracted_data || {};
  const authenticityDetails = report.authenticity_details || {};
  const suspiciousElements = report.suspicious_elements || [];

  // Calculate color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const scoreColor = getScoreColor(authenticityScore);
  const confidenceColor = getScoreColor(confidence);

  return (
    <Box 
      mt={6} 
      p={6} 
      borderWidth="2px" 
      borderRadius="xl" 
      borderColor={`${docInfo.color}.500`}
      bg="gray.800"
      boxShadow="xl"
    >
      <VStack spacing={6} align="stretch">
        {/* Header Section */}
        <HStack justify="space-between" flexWrap="wrap">
          <HStack spacing={3}>
            <Text fontSize="3xl">{docInfo.icon}</Text>
            <VStack align="start" spacing={0}>
              <Badge 
                colorScheme={docInfo.color} 
                fontSize="md" 
                px={3} 
                py={1}
                borderRadius="md"
              >
                {docInfo.name}
              </Badge>
              <Text fontSize="sm" color="gray.400" mt={1}>
                AI Verification Report
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={2}>
            <Badge colorScheme={report.verification_method?.includes("QR") ? "green" : "blue"}>
              {report.verification_method || "AI Verified"}
            </Badge>
            {report.verified_at && (
              <Badge colorScheme="gray" fontSize="xs">
                {new Date(report.verified_at).toLocaleDateString()}
              </Badge>
            )}
          </HStack>
        </HStack>

        <Divider borderColor="gray.600" />

        {/* Score Cards */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {/* Authenticity Score */}
          <Box p={4} bg="gray.700" borderRadius="lg" position="relative">
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Icon as={FiShield} color={`${scoreColor}.400`} />
                <Text fontSize="sm" fontWeight="bold" color="gray.300">
                  Authenticity Score
                </Text>
              </HStack>
              <Badge colorScheme={scoreColor} fontSize="lg">
                {authenticityScore}%
              </Badge>
            </HStack>
            <Progress 
              value={authenticityScore} 
              colorScheme={scoreColor} 
              size="sm" 
              borderRadius="full"
            />
            <Text fontSize="xs" color="gray.400" mt={2}>
              Based on official markers and document quality
            </Text>
          </Box>

          {/* Confidence Score */}
          <Box p={4} bg="gray.700" borderRadius="lg">
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Icon as={FiTrendingUp} color={`${confidenceColor}.400`} />
                <Text fontSize="sm" fontWeight="bold" color="gray.300">
                  AI Confidence
                </Text>
              </HStack>
              <Badge colorScheme={confidenceColor} fontSize="lg">
                {confidence}%
              </Badge>
            </HStack>
            <Progress 
              value={confidence} 
              colorScheme={confidenceColor} 
              size="sm" 
              borderRadius="full"
            />
            <Text fontSize="xs" color="gray.400" mt={2}>
              AI's certainty in the analysis
            </Text>
          </Box>
        </SimpleGrid>

        {/* Verification Summary */}
        {report.verification_summary && (
          <Box p={4} bg="blue.900" borderRadius="lg" borderWidth="1px" borderColor="blue.700">
            <Text fontSize="sm" fontWeight="bold" color="blue.200" mb={2}>
              📋 Verification Summary
            </Text>
            <Text fontSize="sm" color="gray.300">
              {report.verification_summary}
            </Text>
          </Box>
        )}

        {/* Extracted Data */}
        {Object.keys(extractedData).length > 0 && (
          <Box>
            <Text fontSize="md" fontWeight="bold" mb={3} color={`${docInfo.color}.300`}>
              📊 Extracted Data
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {Object.entries(extractedData).map(([key, value]) => {
                // Handle nested objects and arrays
                const renderValue = () => {
                  if (value === "Not found" || value === null || value === undefined) {
                    return (
                      <Text as="span" color="gray.500" fontStyle="italic">
                        Not found
                      </Text>
                    );
                  }
                  
                  // If value is an object or array, render as JSON
                  if (typeof value === 'object') {
                    return (
                      <Box 
                        as="pre" 
                        fontSize="xs" 
                        color="cyan.300" 
                        p={2} 
                        bg="gray.900" 
                        borderRadius="md"
                        overflow="auto"
                        maxH="150px"
                      >
                        {JSON.stringify(value, null, 2)}
                      </Box>
                    );
                  }
                  
                  // Regular string/number value
                  return String(value);
                };

                return (
                  <Box 
                    key={key} 
                    p={3} 
                    bg="gray.700" 
                    borderRadius="md"
                    borderLeftWidth="3px"
                    borderLeftColor={`${docInfo.color}.400`}
                  >
                    <Text fontSize="xs" color="gray.400" textTransform="capitalize">
                      {key.replace(/_/g, ' ')}
                    </Text>
                    <Box fontSize="sm" fontWeight="medium" color="white" mt={1}>
                      {renderValue()}
                    </Box>
                  </Box>
                );
              })}
            </SimpleGrid>
          </Box>
        )}

        {/* Authenticity Details */}
        {authenticityDetails && Object.keys(authenticityDetails).length > 0 && (
          <Box>
            <Text fontSize="md" fontWeight="bold" mb={3} color="green.300">
              ✅ Authenticity Details
            </Text>
            <VStack spacing={3} align="stretch">
              {authenticityDetails.official_markers_found?.length > 0 && (
                <Box p={3} bg="green.900" borderRadius="md" borderWidth="1px" borderColor="green.700">
                  <HStack mb={2}>
                    <Icon as={CheckCircleIcon} color="green.400" />
                    <Text fontSize="sm" fontWeight="bold" color="green.200">
                      Official Markers Found
                    </Text>
                  </HStack>
                  <HStack spacing={2} flexWrap="wrap">
                    {authenticityDetails.official_markers_found.map((marker, idx) => (
                      <Badge key={idx} colorScheme="green" fontSize="xs">
                        {marker}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}

              {authenticityDetails.missing_markers?.length > 0 && (
                <Box p={3} bg="orange.900" borderRadius="md" borderWidth="1px" borderColor="orange.700">
                  <HStack mb={2}>
                    <Icon as={WarningIcon} color="orange.400" />
                    <Text fontSize="sm" fontWeight="bold" color="orange.200">
                      Missing Expected Markers
                    </Text>
                  </HStack>
                  <HStack spacing={2} flexWrap="wrap">
                    {authenticityDetails.missing_markers.map((marker, idx) => (
                      <Badge key={idx} colorScheme="orange" fontSize="xs">
                        {marker}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}

              {authenticityDetails.quality_assessment && (
                <Box p={3} bg="gray.700" borderRadius="md">
                  <Text fontSize="xs" color="gray.400" mb={1}>
                    Quality Assessment:
                  </Text>
                  <Text fontSize="sm" color="gray.200">
                    {authenticityDetails.quality_assessment}
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Suspicious Elements Warning */}
        {suspiciousElements.length > 0 && (
          <Box p={4} bg="red.900" borderRadius="lg" borderWidth="2px" borderColor="red.600">
            <HStack mb={3}>
              <Icon as={WarningIcon} color="red.400" boxSize={5} />
              <Text fontSize="md" fontWeight="bold" color="red.200">
                ⚠️ Suspicious Elements Detected
              </Text>
            </HStack>
            <VStack align="stretch" spacing={2}>
              {suspiciousElements.map((element, idx) => (
                <HStack key={idx} spacing={2}>
                  <Badge colorScheme="red" fontSize="xs">!</Badge>
                  <Text fontSize="sm" color="red.100">
                    {element}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Additional Notes */}
        {report.extraction_notes && (
          <Box p={3} bg="gray.700" borderRadius="md">
            <Text fontSize="xs" color="gray.400" mb={1}>
              📝 Extraction Notes:
            </Text>
            <Text fontSize="sm" color="gray.200">
              {report.extraction_notes}
            </Text>
          </Box>
        )}

        {/* QR Code Content */}
        {report.qr_code_content && (
          <Box p={4} bg="green.900" borderRadius="lg" borderWidth="1px" borderColor="green.700">
            <HStack mb={2}>
              <Badge colorScheme="green">QR Verified</Badge>
              <Text fontSize="sm" fontWeight="bold" color="green.200">
                QR Code Content
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.200" fontFamily="mono">
              {report.qr_code_content}
            </Text>
          </Box>
        )}

        {/* IPFS Link */}
        {ipfsLink && (
          <Box p={4} bg="purple.900" borderRadius="lg" borderWidth="1px" borderColor="purple.700">
            <HStack justify="space-between" flexWrap="wrap">
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="bold" color="purple.200">
                  🌐 Metadata Stored on IPFS
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Permanent, decentralized storage
                </Text>
              </VStack>
              <Link href={ipfsLink} isExternal>
                <Button 
                  size="sm" 
                  colorScheme="purple" 
                  rightIcon={<ExternalLinkIcon />}
                  variant="outline"
                >
                  View on IPFS
                </Button>
              </Link>
            </HStack>
          </Box>
        )}

        {/* AI Model Info */}
        <HStack justify="center" spacing={4} pt={2}>
          <Badge colorScheme="blue" fontSize="xs">
            🤖 Gemini 2.5 Pro
          </Badge>
          <Badge colorScheme="purple" fontSize="xs">
            ⚡ QIE Blockchain
          </Badge>
          <Badge colorScheme="cyan" fontSize="xs">
            🔗 IPFS Stored
          </Badge>
        </HStack>
      </VStack>
    </Box>
  );
};

// Import Button component if not already imported at the top
import { Button } from '@chakra-ui/react';

export default AIReportCard;