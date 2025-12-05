// src/components/FileUpload.jsx - WITH DOCUMENT TYPE SELECTOR
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, Text, Button, VStack, HStack, Icon, Badge, SimpleGrid, 
  Tooltip, Alert, AlertIcon, Progress, useToast, FormControl,
  FormLabel, Select, Radio, RadioGroup, Stack
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiFileText, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { BACKEND_URL } from '../constants';

// Document type configurations with icons and colors
const DOCUMENT_TYPES = {
  invoice: { 
    icon: "💰", 
    name: "Invoice", 
    color: "purple",
    description: "Business invoices and bills"
  },
  property_deed: { 
    icon: "🏠", 
    name: "Property Deed", 
    color: "blue",
    description: "Real estate documents"
  },
  vehicle_registration: { 
    icon: "🚗", 
    name: "Vehicle Registration", 
    color: "orange",
    description: "Car/vehicle documents"
  },
  certificate: { 
    icon: "🎓", 
    name: "Certificate", 
    color: "green",
    description: "Educational credentials"
  },
  supply_chain: { 
    icon: "📦", 
    name: "Supply Chain", 
    color: "cyan",
    description: "Shipping & logistics"
  },
  medical_record: { 
    icon: "⚕️", 
    name: "Medical Record", 
    color: "red",
    description: "Healthcare documents"
  },
  legal_contract: { 
    icon: "📜", 
    name: "Legal Contract", 
    color: "gray",
    description: "Legal agreements"
  },
  insurance_policy: { 
    icon: "🛡️", 
    name: "Insurance", 
    color: "teal",
    description: "Insurance policies"
  }
};

const MotionBox = motion(Box);

const FileUpload = ({
  selectedFile,
  setSelectedFile,
  onAnalyzeAndMint,
  isLoading,
  isMinted
}) => {
  const [selectedDocType, setSelectedDocType] = useState('');
  // const [supportedDocs, setSupportedDocs] = useState([]);
  // const [hoveredType, setHoveredType] = useState(null);
  const toast = useToast();

  // Fetch supported document types from backend
  /*
  useEffect(() => {
    const fetchSupportedDocs = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/supported_documents`);
        if (response.ok) {
          const data = await response.json();
          // setSupportedDocs(data.supported_types || []);
        }
      } catch (error) {
        console.error("Failed to fetch supported documents:", error);
      }
    };

    fetchSupportedDocs();
  }, []);
  */

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      
      toast({
        title: "File Selected ✓",
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [setSelectedFile, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  const handleAnalyze = () => {
    if (!selectedDocType) {
      toast({
        title: "Please select document type",
        description: "Choose what type of document you're uploading",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Pass document type to parent component
    onAnalyzeAndMint(selectedDocType);
  };

  const isReadyToAnalyze = selectedFile && selectedDocType && !isLoading && !isMinted;

  return (
    <VStack spacing={6} w="100%">
      {/* Step 1: Document Type Selection */}
      <Box 
        w="100%" 
        p={5} 
        bg="gray.800" 
        borderRadius="xl" 
        borderWidth="2px" 
        borderColor={selectedDocType ? "purple.500" : "gray.700"}
        transition="all 0.3s"
      >
        <HStack justify="space-between" mb={4}>
          <HStack>
            <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>
              STEP 1
            </Badge>
            <Text fontSize="md" fontWeight="bold" color="purple.300">
              Select Document Type
            </Text>
          </HStack>
          {selectedDocType && (
            <Badge colorScheme="green" fontSize="sm">
              {DOCUMENT_TYPES[selectedDocType].icon} Selected
            </Badge>
          )}
        </HStack>
        
        <Text fontSize="xs" color="gray.400" mb={4}>
          Choose the type of document you're uploading. This helps our AI provide more accurate analysis.
        </Text>

        {/* Document Type Grid Selection */}
        <RadioGroup value={selectedDocType} onChange={setSelectedDocType}>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            {Object.entries(DOCUMENT_TYPES).map(([type, info]) => (
              <Tooltip 
                key={type} 
                label={info.description} 
                placement="top"
                hasArrow
              >
                <Box
                  as="label"
                  cursor="pointer"
                  borderRadius="lg"
                  borderWidth="2px"
                  borderColor={selectedDocType === type ? `${info.color}.400` : "gray.600"}
                  bg={selectedDocType === type ? `${info.color}.900` : "gray.700"}
                  p={3}
                  transition="all 0.2s"
                  _hover={{
                    borderColor: `${info.color}.400`,
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg'
                  }}
                  position="relative"
                >
                  <Radio value={type} colorScheme={info.color} position="absolute" top={2} right={2} />
                  <VStack spacing={2} align="center">
                    <Text fontSize="2xl">{info.icon}</Text>
                    <Text fontSize="xs" fontWeight="bold" textAlign="center">
                      {info.name}
                    </Text>
                  </VStack>
                </Box>
              </Tooltip>
            ))}
          </SimpleGrid>
        </RadioGroup>

        {/* Selected Type Info */}
        {selectedDocType && (
          <Alert 
            status="info" 
            mt={4} 
            borderRadius="md"
            bg={`${DOCUMENT_TYPES[selectedDocType].color}.900`}
            borderWidth="1px"
            borderColor={`${DOCUMENT_TYPES[selectedDocType].color}.600`}
          >
            <AlertIcon color={`${DOCUMENT_TYPES[selectedDocType].color}.300`} />
            <VStack align="start" spacing={1} flex={1}>
              <Text fontSize="sm" fontWeight="bold" color={`${DOCUMENT_TYPES[selectedDocType].color}.200`}>
                {DOCUMENT_TYPES[selectedDocType].icon} {DOCUMENT_TYPES[selectedDocType].name} Selected
              </Text>
              <Text fontSize="xs" color="gray.300">
                AI will focus on extracting data specific to this document type
              </Text>
            </VStack>
          </Alert>
        )}
      </Box>

      {/* Step 2: File Upload */}
      <Box 
        w="100%" 
        p={5} 
        bg="gray.800" 
        borderRadius="xl" 
        borderWidth="2px" 
        borderColor={selectedFile ? "green.500" : selectedDocType ? "gray.700" : "gray.800"}
        opacity={!selectedDocType ? 0.5 : 1}
        transition="all 0.3s"
      >
        <HStack justify="space-between" mb={4}>
          <HStack>
            <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>
              STEP 2
            </Badge>
            <Text fontSize="md" fontWeight="bold" color="purple.300">
              Upload Document
            </Text>
          </HStack>
          {selectedFile && (
            <Badge colorScheme="green" fontSize="sm">
              ✓ File Ready
            </Badge>
          )}
        </HStack>

        {!selectedDocType && (
          <Alert status="warning" mb={4} borderRadius="md">
            <AlertIcon />
            <Text fontSize="xs">Please select a document type first</Text>
          </Alert>
        )}

        <MotionBox
          {...getRootProps()}
          w="100%"
          p={8}
          borderWidth="3px"
          borderRadius="xl"
          borderStyle="dashed"
          borderColor={isDragActive ? "purple.400" : selectedFile ? "green.400" : "gray.600"}
          bg={isDragActive ? "purple.900" : selectedFile ? "green.900" : "gray.900"}
          textAlign="center"
          cursor={selectedDocType ? "pointer" : "not-allowed"}
          transition="all 0.3s ease"
          opacity={!selectedDocType ? 0.6 : 1}
          whileHover={selectedDocType ? { 
            scale: 1.02, 
            borderColor: isDragActive ? "#9F7AEA" : selectedFile ? "#48BB78" : "#805AD5"
          } : {}}
          whileTap={selectedDocType ? { scale: 0.98 } : {}}
        >
          <input {...getInputProps()} disabled={!selectedDocType} />
          <VStack spacing={4}>
            {selectedFile ? (
              <>
                <Icon as={FiCheckCircle} w={16} h={16} color="green.400" />
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color="green.300">
                    ✓ File Ready for Analysis
                  </Text>
                  <Text fontSize="md" color="gray.300" fontWeight="medium">
                    {selectedFile.name}
                  </Text>
                  <HStack spacing={4} fontSize="sm" color="gray.400">
                    <Text>📄 {(selectedFile.size / 1024).toFixed(2)} KB</Text>
                    <Text>🕐 {new Date().toLocaleTimeString()}</Text>
                  </HStack>
                </VStack>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                  leftIcon={<FiUploadCloud />}
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('file-input-hidden').click();
                  }}
                >
                  Change File
                </Button>
              </>
            ) : (
              <>
                <Icon 
                  as={FiUploadCloud} 
                  w={16} 
                  h={16} 
                  color={isDragActive ? "purple.300" : "gray.500"} 
                />
                <VStack spacing={2}>
                  {isDragActive ? (
                    <Text fontSize="xl" fontWeight="bold" color="purple.300">
                      🎯 Drop it here!
                    </Text>
                  ) : (
                    <>
                      <Text fontSize="xl" fontWeight="bold">
                        Drag & Drop Your {selectedDocType ? DOCUMENT_TYPES[selectedDocType].name : 'Document'}
                      </Text>
                      <Text fontSize="md" color="gray.400">
                        or click to browse files
                      </Text>
                    </>
                  )}
                  <HStack spacing={2} mt={2}>
                    <Badge colorScheme="blue">PDF</Badge>
                    <Badge colorScheme="green">JPG</Badge>
                    <Badge colorScheme="cyan">PNG</Badge>
                  </HStack>
                </VStack>
              </>
            )}
          </VStack>
        </MotionBox>
      </Box>

      {/* AI Analysis Info */}
      {isReadyToAnalyze && (
        <Alert 
          status="info" 
          borderRadius="lg" 
          bg="blue.900" 
          borderWidth="1px" 
          borderColor="blue.700"
        >
          <AlertIcon color="blue.300" />
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="bold" fontSize="sm" color="blue.200">
              🤖 Ready to Analyze {DOCUMENT_TYPES[selectedDocType].icon} {DOCUMENT_TYPES[selectedDocType].name}
            </Text>
            <Text fontSize="xs" color="gray.300">
              Gemini AI will extract specific fields for this document type, verify authenticity, 
              scan QR codes, and generate a trust score before minting your NFT on QIE Blockchain.
            </Text>
          </VStack>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box w="100%" p={4} bg="purple.900" borderRadius="lg" borderWidth="1px" borderColor="purple.700">
          <VStack spacing={3}>
            <HStack spacing={2}>
              <Text fontSize="sm" fontWeight="bold" color="purple.200">
                🔄 Analyzing {DOCUMENT_TYPES[selectedDocType]?.name || 'Document'}...
              </Text>
            </HStack>
            <Progress 
              size="sm" 
              isIndeterminate 
              colorScheme="purple" 
              w="100%" 
              borderRadius="full"
            />
            <HStack spacing={4} fontSize="xs" color="gray.400" flexWrap="wrap">
              <Text>⚡ Gemini AI Processing</Text>
              <Text>📸 QR Verification</Text>
              <Text>🔗 IPFS Upload</Text>
              <Text>⛓️ Blockchain Minting</Text>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Action Button */}
      <Button
        onClick={handleAnalyze}
        isLoading={isLoading}
        isDisabled={!isReadyToAnalyze}
        loadingText={`Analyzing ${selectedDocType ? DOCUMENT_TYPES[selectedDocType].name : ''}...`}
        colorScheme="purple"
        size="lg"
        w="100%"
        h="60px"
        fontSize="lg"
        fontWeight="bold"
        leftIcon={<Icon as={FiFileText} />}
        _hover={{
          transform: isReadyToAnalyze ? 'translateY(-2px)' : 'none',
          boxShadow: isReadyToAnalyze ? '0 8px 20px rgba(128, 90, 213, 0.4)' : 'none'
        }}
        transition="all 0.3s"
      >
        {isMinted ? "✅ Minted Successfully!" : 
         !selectedDocType ? "1️⃣ Select Document Type First" :
         !selectedFile ? "2️⃣ Upload File to Continue" :
         `🚀 Analyze ${DOCUMENT_TYPES[selectedDocType].name} & Mint NFT`}
      </Button>

      {/* Success State */}
      {isMinted && (
        <Alert 
          status="success" 
          borderRadius="lg" 
          bg="green.900" 
          borderWidth="1px" 
          borderColor="green.700"
        >
          <AlertIcon color="green.300" />
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="bold" fontSize="sm" color="green.200">
              🎉 {DOCUMENT_TYPES[selectedDocType].name} NFT Minted on QIE Blockchain!
            </Text>
            <Text fontSize="xs" color="gray.300">
              Your verified {DOCUMENT_TYPES[selectedDocType].name} RWA NFT is now on-chain with AI verification report stored on IPFS
            </Text>
          </VStack>
        </Alert>
      )}

      {/* Feature Highlights */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="100%" pt={2}>
        <Box p={3} bg="gray.800" borderRadius="md" textAlign="center">
          <Text fontSize="2xl" mb={1}>⚡</Text>
          <Text fontSize="xs" fontWeight="bold" color="purple.300">
            25,000+ TPS
          </Text>
          <Text fontSize="xs" color="gray.400">
            QIE Blockchain Speed
          </Text>
        </Box>
        <Box p={3} bg="gray.800" borderRadius="md" textAlign="center">
          <Text fontSize="2xl" mb={1}>🔥</Text>
          <Text fontSize="xs" fontWeight="bold" color="orange.300">
            Near-Zero Fees
          </Text>
          <Text fontSize="xs" color="gray.400">
            80% Gas Burn
          </Text>
        </Box>
        <Box p={3} bg="gray.800" borderRadius="md" textAlign="center">
          <Text fontSize="2xl" mb={1}>🤖</Text>
          <Text fontSize="xs" fontWeight="bold" color="green.300">
            AI Verified
          </Text>
          <Text fontSize="xs" color="gray.400">
            Gemini 2.5 Pro
          </Text>
        </Box>
      </SimpleGrid>
    </VStack>
  );
};

export default FileUpload;