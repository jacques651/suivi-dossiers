import { useEffect, useState } from 'react';
import {
  Tabs, Card, Group, Avatar, Text, Badge, Flex,
  Button, Container, Stack, Box, Title, 
  Center, Loader
} from '@mantine/core';
import {
  IconDatabase,
  IconRefresh,
  IconUserStar,
  IconGavel,
  IconSignature,
  IconBuildingCommunity,
  IconSettings,
  IconHdr,
  IconHistory
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';

// Import des composants modulaires
import { GradesTab } from '../components/referentiels/GradesTab';
import { SanctionsTab } from '../components/referentiels/SanctionsTab';
import { SignatairesTab } from '../components/referentiels/SignatairesTab';
import { ServicesTab } from '../components/referentiels/ServicesTab';
import { ParametresTab } from '../components/referentiels/ParametresTab';
import { EntetesTab } from '../components/referentiels/EntetesTab';
import { LogsTab } from '../components/referentiels/LogsTab';

// Types
import { Grade, Sanction, Signataire, ServiceInvestigation, ParametreGeneral, EnteteDocument, Log } from '../components/referentiels/types';

export default function Referentiels() {
  const [activeTab, setActiveTab] = useState<string | null>('grades');
  const [loading, setLoading] = useState(true);
  
  // États pour les données
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [signataires, setSignataires] = useState<Signataire[]>([]);
  const [services, setServices] = useState<ServiceInvestigation[]>([]);
  const [parametres, setParametres] = useState<ParametreGeneral[]>([]);
  const [enteteDocuments, setEnteteDocuments] = useState<EnteteDocument[]>([]);  // ← MODIFIÉ : tableau simple
  const [logs, setLogs] = useState<Log[]>([]);

  // Chargement initial
  useEffect(() => {
    loadEssentialData();
  }, []);

  // Chargement selon l'onglet
  useEffect(() => {
    if (activeTab === 'parametres') loadParametres();
    if (activeTab === 'entete') loadEnteteDocuments();
    if (activeTab === 'logs') loadLogs();
  }, [activeTab]);

  const loadEssentialData = async () => {
    setLoading(true);
    await Promise.all([
      loadGrades(),
      loadSanctions(),
      loadSignataires(),
      loadServices()
    ]);
    setLoading(false);
  };

  const loadGrades = async () => {
    try {
      const result = await invoke('get_grades');
      setGrades(result as Grade[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les grades', color: 'red' });
    }
  };

  const loadSanctions = async () => {
    try {
      const result = await invoke('get_sanctions');
      setSanctions(result as Sanction[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les sanctions', color: 'red' });
    }
  };

  const loadSignataires = async () => {
    try {
      const result = await invoke('get_all_signataires');
      setSignataires(result as Signataire[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les signataires', color: 'red' });
    }
  };

  const loadServices = async () => {
    try {
      const result = await invoke('get_all_services_investigation');
      setServices(result as ServiceInvestigation[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les services', color: 'red' });
    }
  };

  const loadParametres = async () => {
    try {
      const result = await invoke('get_parametres_generaux');
      setParametres(result as ParametreGeneral[]);
    } catch (error) {
      console.warn('Impossible de charger les paramètres:', error);
      setParametres([]);
    }
  };

  const loadEnteteDocuments = async () => {
    try {
      const result = await invoke('get_entete_document', { typeDocument: 'GLOBAL' });
      setEnteteDocuments(result as EnteteDocument[]);
    } catch (error) {
      console.error('Erreur chargement entête:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const result = await invoke('get_logs_with_users', { limit: 200 });
      setLogs(result as Log[]);
    } catch (error) {
      console.warn('Impossible de charger l\'historique:', error);
      setLogs([]);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await loadEssentialData();
    await loadParametres();
    await loadEnteteDocuments();
    await loadLogs();
    setLoading(false);
  };


  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des référentiels...</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          {/* Header compact */}
          <Card withBorder radius="md" p="sm" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Flex justify="space-between" align="center" wrap="wrap" gap="md">
              <Flex gap="md" align="center" wrap="wrap">
                <Avatar size={40} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconDatabase size={20} color="white" />
                </Avatar>
                <Box>
                  <Title order={3} c="white" size="h4">Configuration des Référentiels</Title>
                  <Text c="gray.3" size="xs">Gérez les grades, sanctions, signataires et paramètres</Text>
                </Box>
              </Flex>
              <Group gap="xs">
                <Badge size="sm" variant="white" color="blue">v2.0</Badge>
                <Button size="xs" variant="light" color="white" leftSection={<IconRefresh size={14} />} onClick={loadAllData} radius="md">
                  Actualiser
                </Button>
              </Group>
            </Flex>
          </Card>

          {/* Tabs avec composants modulaires */}
          <Card withBorder radius="md" shadow="none" p={0}>
            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
              <Tabs.List grow p="xs" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                <Tabs.Tab value="grades" leftSection={<IconUserStar size={16} />}>Grades</Tabs.Tab>
                <Tabs.Tab value="sanctions" leftSection={<IconGavel size={16} />}>Sanctions</Tabs.Tab>
                <Tabs.Tab value="signataires" leftSection={<IconSignature size={16} />}>Signataires</Tabs.Tab>
                <Tabs.Tab value="services" leftSection={<IconBuildingCommunity size={16} />}>Services</Tabs.Tab>
                <Tabs.Tab value="parametres" leftSection={<IconSettings size={16} />}>Paramètres</Tabs.Tab>
                <Tabs.Tab value="entete" leftSection={<IconHdr size={16} />}>En-têtes</Tabs.Tab>
                <Tabs.Tab value="logs" leftSection={<IconHistory size={16} />}>Historique</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="grades" p="xs">
                <GradesTab grades={grades} onRefresh={loadEssentialData} />
              </Tabs.Panel>

              <Tabs.Panel value="sanctions" p="xs">
                <SanctionsTab sanctions={sanctions} onRefresh={loadEssentialData} />
              </Tabs.Panel>

              <Tabs.Panel value="signataires" p="xs">
                <SignatairesTab signataires={signataires} onRefresh={loadEssentialData} />
              </Tabs.Panel>

              <Tabs.Panel value="services" p="xs">
                <ServicesTab services={services} onRefresh={loadEssentialData} />
              </Tabs.Panel>

              <Tabs.Panel value="parametres" p="xs">
                <ParametresTab parametres={parametres} onRefresh={loadParametres} />
              </Tabs.Panel>

              <Tabs.Panel value="entete" p="xs">
                <EntetesTab enteteDocuments={enteteDocuments} onRefresh={loadEnteteDocuments} />  {/* ← MODIFIÉ */}
              </Tabs.Panel>

              <Tabs.Panel value="logs" p="xs">
                <LogsTab logs={logs} onRefresh={loadLogs} />
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}