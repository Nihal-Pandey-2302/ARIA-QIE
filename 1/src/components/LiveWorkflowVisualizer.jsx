// src/components/LiveWorkflowVisualizer.jsx

import { HStack, VStack, Text, Icon, Box } from '@chakra-ui/react';
import { FaCheckCircle, FaHourglassHalf, FaBrain, FaCube, FaStore, FaGem } from 'react-icons/fa';
import { motion } from 'framer-motion';

const WorkflowStep = ({ icon, label, isActive, isCompleted }) => {
  const getStatusColor = () => {
    if (isCompleted) return 'green.400';
    if (isActive) return 'purple.400';
    return 'gray.600';
  };

  const statusIcon = isCompleted ? FaCheckCircle : (isActive && (label.endsWith('...') || label === 'Ready') ? FaHourglassHalf : icon);

  return (
    <VStack color={getStatusColor()} spacing={1} as={motion.div} whileHover={{ scale: 1.1 }}>
      <Icon as={statusIcon} boxSize={8} />
      <Text fontSize="sm" fontWeight="bold">{label}</Text>
    </VStack>
  );
};

const LiveWorkflowVisualizer = ({ status }) => {
  // ✅ REMOVED the intermediate "Listing..." step for a cleaner flow
  const steps = [
    { key: 'analyzing', icon: FaBrain, label: 'AI Analysis' },
    { key: 'uploading', icon: FaCube, label: 'IPFS Upload' },
    { key: 'ready', icon: FaHourglassHalf, label: 'Ready' },
    { key: 'minting', icon: FaGem, label: 'Minting...' },
    { key: 'minted', icon: FaCheckCircle, label: 'Minted' },
    { key: 'listed', icon: FaStore, label: 'Listed' },
  ];

  const activeIndex = steps.findIndex(step => step.key === status);

  return (
    <Box p={4} bg="gray.900" borderRadius="lg" w="100%" my={6}>
      <HStack justify="space-around" align="center">
        {steps.map((step, index) => (
          <WorkflowStep
            key={step.key}
            icon={step.icon}
            label={step.label}
            isActive={status === step.key}
            isCompleted={index < activeIndex}
          />
        ))}
      </HStack>
    </Box>
  );
};

export default LiveWorkflowVisualizer;