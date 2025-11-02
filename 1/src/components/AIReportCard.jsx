import {
  Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, Badge, Text, Divider, VStack,
  CircularProgress, CircularProgressLabel, Link, HStack, Icon
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa'; // Import checkmark icon

const AIReportCard = ({ report, ipfsLink }) => {
  // Use a default of 0 for the score to prevent errors if the field is missing
  const score = (report.authenticity_score || 0) * 100;
  
  // Check if qr_verified_data exists and is not an empty object
  const qrDataExists = report.qr_verified_data && Object.keys(report.qr_verified_data).length > 0;

  return (
    <Box
      as={motion.div}
      mt={8} p={5} borderWidth="1px" borderRadius="lg" borderColor="gray.700"
      width="100%" bg="gray.800"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
    >
      <VStack spacing={2}>
        <Heading as="h3" size="lg" textAlign="center">
          A.R.I.A. Verification Report
        </Heading>
        {report.verification_method && (
          <Badge 
            colorScheme={report.verification_method.includes("QR") ? "green" : "purple"}
            px={4} py={1} borderRadius="full" variant="solid" fontSize="md"
          >
            {report.verification_method}
          </Badge>
        )}
      </VStack>
      <Divider my={5} />

      {/* This new section will display the data confirmed via the QR code */}
      {qrDataExists && (
        <>
          <Box mb={6} p={4} bg="green.900" borderRadius="md" borderWidth="1px" borderColor="green.700">
            <Heading size="sm" color="green.200" mb={3}>QR Code Data Match:</Heading>
            <VStack align="stretch" spacing={2}>
              {Object.entries(report.qr_verified_data).map(([key, value]) => (
                <HStack key={key}>
                  <Icon as={FaCheckCircle} color="green.400" />
                  <Text color="gray.300"><Text as="span" fontWeight="bold">{key}:</Text> {value}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        </>
      )}

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6} textAlign="center">
        <Stat>
          <VStack>
            <StatLabel color="gray.400">Authenticity Score</StatLabel>
            <CircularProgress value={score} color="green.400" size="120px" thickness="8px" mt={2}>
              <CircularProgressLabel fontSize="2xl" fontWeight="bold">{score.toFixed(0)}%</CircularProgressLabel>
            </CircularProgress>
          </VStack>
        </Stat>
        <Stat>
            <StatLabel color="gray.400">Document Value</StatLabel>
            <StatNumber fontSize="3xl">{report.total} {report.currency}</StatNumber>
        </Stat>
         <Stat>
          <StatLabel color="gray.400">Invoice Detected</StatLabel>
          <StatNumber>
            <Badge fontSize="md" px={3} py={1} borderRadius="full" colorScheme={report.is_invoice ? "green" : "red"}>
              {report.is_invoice ? "Yes" : "No"}
            </Badge>
          </StatNumber>
        </Stat>
      </SimpleGrid>

      <Box mt={4} p={4} bg="gray.900" borderRadius="md">
        <Text fontWeight="bold" color="gray.300">AI Verification Summary:</Text>
        <Text color="gray.400" mt={1}>{report.verification_summary}</Text>
      </Box>

      <Box mt={4}>
        <Text fontWeight="bold" color="gray.300">Immutable Record:</Text>
        <Link href={ipfsLink} isExternal color="blue.400">
          View on IPFS
        </Link>
      </Box>
    </Box>
  );
};

export default AIReportCard;