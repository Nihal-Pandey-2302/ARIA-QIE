// src/components/PayloadViewer.jsx

import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Code // Use Chakra's Code component for styling
} from '@chakra-ui/react';

const PayloadViewer = ({ payload }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button onClick={onOpen} size="sm" variant="outline" colorScheme="purple" mt={4}>
        View Transaction Payload
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Blockchain Message Payload</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {/* We use <pre> and <code> for pre-formatted text, the standard for code display */}
            <Box
              as="pre" // The <pre> tag preserves whitespace and line breaks
              p={4}
              bg="blackAlpha.500"
              borderRadius="md"
              overflowX="auto" // Add horizontal scroll for long lines
              maxHeight="60vh" // Set a max height for large objects
              overflowY="auto" // Add vertical scroll
            >
              <Code bg="transparent" p={0} fontSize="sm">
                {/* JSON.stringify with spacing of 2 creates the pretty-print effect */}
                {JSON.stringify(payload, null, 2)}
              </Code>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PayloadViewer;