// src/pages/agents/AgentPrintModal.tsx
import { useState } from 'react';
import { Modal, Stack, Text, Group, Button, Divider, Select, Alert } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import type { Agent, Grade } from './AgentManager';

interface AgentPrintModalProps {
  opened: boolean;
  onClose: () => void;
  agents: Agent[];
  grades: Grade[];
  onPrintWithCustomObject: (orientation: 'portrait' | 'landscape') => void;
}

export default function AgentPrintModal({ 
  opened, 
  onClose, 
  agents, 
  onPrintWithCustomObject 
}: AgentPrintModalProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconPrinter size={20} color="white" />
          <Text fw={700} size="lg" c="white">Options d'impression</Text>
        </Group>
      }
      size="md"
      centered
      overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
      transitionProps={{ transition: 'fade', duration: 200 }}
      styles={{
        header: { background: 'linear-gradient(135deg, #1b365d 0%, #295080 100%)', padding: '1.5rem' },
        close: { color: 'white', '&:hover': { background: 'rgba(255,255,255,0.2)', transform: 'rotate(90deg)' } }
      }}
    >
      <Stack gap="md">
        <Alert color="blue" variant="light">
          <Text size="sm">Vous allez imprimer {agents.length} agent(s)</Text>
        </Alert>

        <Select
          label="Orientation"
          value={orientation}
          onChange={(val) => setOrientation(val as 'portrait' | 'landscape')}
          data={[
            { value: 'portrait', label: '🧾 Portrait' },
            { value: 'landscape', label: '📄 Paysage (Recommandé)' }
          ]}
        />

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Annuler</Button>
          <Button
            variant="gradient"
            gradient={{ from: '#1b365d', to: '#2a4a7a' }}
            leftSection={<IconPrinter size={16} />}
            onClick={() => {
              onClose();
              onPrintWithCustomObject(orientation);
            }}
          >
            Continuer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}