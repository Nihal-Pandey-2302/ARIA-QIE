// src/components/AnalysisReport.jsx
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Text,
  Link,
  Divider,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

// No need for MotionBox
// const MotionBox = motion(Box);

const AnalysisReport = ({ aiAnalysisResult }) => {
  const { ai_report_display, transaction_payload, ipfs_link } = aiAnalysisResult;

  return (
    // Use motion.div and pass Chakra's style props via the `as` prop
    // This is a common and effective pattern.
    <Box as={motion.div}
      mt={8}
      p={5}
      borderWidth="1px"
      borderRadius="lg"
      borderColor="gray.700"
      width="100%"
      bg="gray.900"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Heading as="h3" size="lg" mb={4} textAlign="center">
        Step 2: AI Analysis Report
      </Heading>
      <Divider mb={5} />
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
        <Stat>
          <StatLabel color="gray.400">Invoice Detected</StatLabel>
          <StatNumber>
            <Badge fontSize="md" px={3} py={1} borderRadius="full" colorScheme={ai_report_display.is_invoice ? "green" : "red"}>
              {ai_report_display.is_invoice ? "Yes" : "No"}
            </Badge>
          </StatNumber>
        </Stat>
        <Stat>
            <StatLabel color="gray.400">Authenticity Score</StatLabel>
            <StatNumber>{(ai_report_display.authenticity_score * 100).toFixed(0)}%</StatNumber>
        </Stat>
        <Stat>
            <StatLabel color="gray.400">Document Value</StatLabel>
            <StatNumber>{ai_report_display.total} {ai_report_display.currency}</StatNumber>
            <StatHelpText>Suggested RWA Value: {parseFloat(transaction_payload.verify_and_mint.suggested_value) / 1e6} ANDR</StatHelpText>
        </Stat>
        <Stat>
            <StatLabel color="gray.400">Issue Date</StatLabel>
            <StatNumber>{ai_report_display.date || "N/A"}</StatNumber>
        </Stat>
      </SimpleGrid>
      <Box mt={4}>
        <Text fontWeight="bold" color="gray.300">Verification Summary:</Text>
        <Text color="gray.400">{ai_report_display.verification_summary}</Text>
      </Box>
      <Box mt={4}>
        <Text fontWeight="bold" color="gray.300">IPFS Metadata:</Text>
        <Link color="blue.400" href={ipfs_link} isExternal>
          View on IPFS
        </Link>
      </Box>
    </Box>
  );
};

export default AnalysisReport;