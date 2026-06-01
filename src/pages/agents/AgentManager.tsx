// src/pages/agents/AgentManager.tsx
import { useEffect, useState, useRef } from 'react';
import { Stack, Card, Text, Group, Button, Box, Container, Center, Loader, ThemeIcon, Transition, Paper, Divider, Modal, Textarea, Alert } from '@mantine/core';
import { IconDownload, IconPlus, IconPrinter, IconRefresh, IconTrendingUp, IconUpload, IconInfoCircle } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { usePrint } from '../../hooks/usePrint';
import AgentDeleteModal from './AgentDeleteModal';
import AgentExportModal from './AgentExportModal';
import AgentImportModal from './AgentImportModal';

import AgentFilters from './AgentFilters';
import AgentFormModal from './AgentFormModal';
import AgentStatsCards from './AgentStatsCards';
import AgentTable from './AgentTable';
import AgentViewModal from './AgentViewModal';
import PageHeader from '../../components/PageHeader';
import AgentPrintModal from './AgentPrintModal';

// Définition et export des interfaces
export interface Agent {
  PersonnelID: number;
  Matricule: string;
  Cle?: string;
  Nom: string;
  Prenom: string;
  GradeID?: number;
  GradeLibelle?: string;
  Service?: string;
  Entite?: string;
  Sexe?: string;
  Photo?: string;
  CreatedAt?: string;
}

export interface Grade {
  GradeID: number;
  LibelleGrade: string;
}

export default function AgentManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const { printDocument } = usePrint();

  // États modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printCustomObjectModalOpen, setPrintCustomObjectModalOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [customObject, setCustomObject] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSexe, setSelectedSexe] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedEntite, setSelectedEntite] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    loadGrades();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_agents');
      const data = result as Agent[];
      setAgents(data);
      const services = [...new Set(data.map(a => a.Service).filter(Boolean))] as string[];
      setServiceOptions(services);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les agents',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGrades = async () => {
    try {
      const result = await invoke('get_grades');
      setGrades(result as Grade[]);
    } catch (error) {
      console.error('Erreur chargement grades:', error);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setSelectedAgent(null);
    setFormModalOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingId(agent.PersonnelID);
    setSelectedAgent(agent);
    setFormModalOpen(true);
  };

  const handleView = (agent: Agent) => {
    setSelectedAgent(agent);
    setViewModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setAgentToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleSaved = () => {
    setFormModalOpen(false);
    setSelectedAgent(null);
    setEditingId(null);
    loadAgents();
  };

  const handleDeleted = () => {
    setDeleteModalOpen(false);
    setAgentToDelete(null);
    loadAgents();
  };

  const handleImported = () => {
    loadAgents();
    loadGrades();
  };

  // Ouvrir le modal d'impression avec objet personnalisé
  const openPrintModalWithCustomObject = (orientation: 'portrait' | 'landscape') => {
    setPrintOrientation(orientation);
    setCustomObject('');
    setPrintCustomObjectModalOpen(true);
  };

  // Gestion de l'impression avec objet personnalisé
  const handlePrintWithCustomObject = () => {
    // Créer le contenu HTML pour l'impression
    const rows = filteredAgents.map((agent, index) => {
      const gradeLibelle = agent.GradeLibelle || grades.find(g => g.GradeID === agent.GradeID)?.LibelleGrade || '-';
      return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px;">${agent.Matricule || '-'}</td>
          <td style="padding: 8px;">${agent.Nom || ''} ${agent.Prenom || ''}</td>
          <td style="padding: 8px; text-align: center;">${gradeLibelle}</td>
          <td style="padding: 8px;">${agent.Sexe === 'M' ? 'Masculin' : agent.Sexe === 'F' ? 'Féminin' : '-'}</td>
          <td style="padding: 8px;">${agent.Service || '-'}</td>
          <td style="padding: 8px;">${agent.Entite || '-'}</td>
         </tr>
      `;
    }).join('');

    // Utiliser l'objet personnalisé s'il est fourni
    const objetText = customObject.trim() || "LISTE DES AGENTS";

    const content = `
      <div style="margin: 20px 0; font-weight: bold; font-size: 14px;">OBJET : ${objetText}</div>
      <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #1b365d; color: white;">
            <th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">N°</th>
            <th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">Matricule</th>
            <th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">Nom et Prénom</th>
            <th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">Grade</th>
            <th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">Sexe</th>
            <th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">Service</th>
            <th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">Entité</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 15px; text-align: right; font-weight: bold;">
        Total : ${filteredAgents.length} agent(s)
      </div>
    `;

    printDocument(content, objetText, printOrientation);
    setPrintCustomObjectModalOpen(false);
  };

  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      agent.Nom?.toLowerCase().includes(searchLower) ||
      agent.Prenom?.toLowerCase().includes(searchLower) ||
      agent.Matricule?.toLowerCase().includes(searchLower);
    const matchesSexe = !selectedSexe || agent.Sexe === selectedSexe;
    const matchesService = !selectedService || agent.Service === selectedService;
    const matchesEntite = !selectedEntite || agent.Entite === selectedEntite;
    return matchesSearch && matchesSexe && matchesService && matchesEntite;
  });

  if (loading) {
    return (
      <Center style={{ height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Paper p="xl" radius="xl" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
          <Stack align="center" gap="md">
            <Loader size="xl" variant="dots" color="#667eea" />
            <Text size="lg" fw={500} variant="gradient" gradient={{ from: '#667eea', to: '#764ba2' }}>
              Chargement des agents...
            </Text>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Box style={{ background: '#f8f9fa', minHeight: '100vh' }} p="md">
      <Container size="full" fluid>
        <Stack gap="xl">
          <PageHeader 
            title="Gestion des Agents"
            subtitle={`${agents.length} agents enregistrés`}
          />

          <Transition mounted={true} transition="slide-down" duration={500}>
            {(styles) => (
              <div style={styles}>
                <AgentStatsCards agents={agents} />
              </div>
            )}
          </Transition>

          {/* Filtres et Boutons */}
          <Transition mounted={true} transition="slide-down" duration={550}>
            {(styles) => (
              <Card withBorder radius="lg" shadow="sm" p="md" style={styles}>
                <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                  <div style={{ flex: 2 }}>
                    <AgentFilters
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      selectedSexe={selectedSexe}
                      onSexeChange={setSelectedSexe}
                      selectedService={selectedService}
                      onServiceChange={setSelectedService}
                      selectedEntite={selectedEntite}
                      onEntiteChange={setSelectedEntite}
                      serviceOptions={serviceOptions}
                    />
                  </div>

                  <Group gap="md" align="flex-end">
                    <Button
                      variant="light"
                      color="dark"
                      leftSection={<IconRefresh size={18} />}
                      onClick={loadAgents}
                      style={{
                        backgroundColor: 'rgba(27, 54, 93, 0.1)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Actualiser
                    </Button>

                    <Button
                      variant="light"
                      color="dark"
                      leftSection={<IconPlus size={18} />}
                      onClick={handleAdd}
                      style={{
                        backgroundColor: 'rgba(27, 54, 93, 0.1)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Nouvel Agent
                    </Button>
                  </Group>
                </Group>

                <Divider my="md" />

                <Group justify="space-between">
                  <Text size="xs" c="dimmed">{filteredAgents.length} agent(s) trouvé(s)</Text>
                  <Group gap="xs">
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<IconDownload size={14} />}
                      onClick={() => setExportModalOpen(true)}
                    >
                      Exporter
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<IconUpload size={14} />}
                      onClick={() => setImportModalOpen(true)}
                    >
                      Importer
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<IconPrinter size={14} />}
                      onClick={() => setPrintModalOpen(true)}
                    >
                      Imprimer
                    </Button>
                    {(searchTerm || selectedSexe || selectedService || selectedEntite) && (
                      <Button variant="subtle" size="xs" onClick={() => {
                        setSearchTerm('');
                        setSelectedSexe(null);
                        setSelectedService(null);
                        setSelectedEntite(null);
                      }}>
                        Effacer les filtres
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>
            )}
          </Transition>

          {/* Résumé des filtres */}
          {(searchTerm || selectedSexe || selectedService || selectedEntite) && (
            <Transition mounted={true} transition="fade" duration={400}>
              {(styles) => (
                <Card withBorder radius="md" p="sm" style={styles}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light" color="blue">
                        <IconTrendingUp size={12} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>
                        {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} trouvé{filteredAgents.length !== 1 ? 's' : ''}
                      </Text>
                    </Group>
                  </Group>
                </Card>
              )}
            </Transition>
          )}

          {/* Tableau */}
          <Transition mounted={true} transition="fade" duration={600}>
            {(styles) => (
              <div ref={printRef} style={styles}>
                <AgentTable
                  agents={filteredAgents}
                  grades={grades}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            )}
          </Transition>
        </Stack>
      </Container>

      {/* Modals */}
      <AgentFormModal
        opened={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        agent={selectedAgent}
        editingId={editingId}
        grades={grades}
        serviceOptions={serviceOptions}
        onSaved={handleSaved}
      />

      <AgentViewModal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        agent={selectedAgent}
        grades={grades}
      />

      <AgentDeleteModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        agentId={agentToDelete}
        onDeleted={handleDeleted}
      />

      <AgentExportModal
        opened={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        agents={filteredAgents}
        grades={grades}
      />

      <AgentImportModal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={handleImported}
      />

      <AgentPrintModal
        opened={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        agents={filteredAgents}
        grades={grades}
        onPrintWithCustomObject={openPrintModalWithCustomObject}
      />

      {/* Modal Impression avec objet personnalisé */}
      <Modal
        opened={printCustomObjectModalOpen}
        onClose={() => setPrintCustomObjectModalOpen(false)}
        title={
          <Group gap="sm">
            <IconPrinter size={20} color="white" />
            <Text fw={700} size="lg" c="white">Paramètres d'impression</Text>
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
        <form onSubmit={(e) => { e.preventDefault(); handlePrintWithCustomObject(); }}>
          <Stack gap="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
              <Text size="sm" fw={500}>Définissez l'objet du document à imprimer</Text>
            </Alert>
            
            <Textarea
              label="Objet du document"
              description="Personnalisez l'objet qui apparaîtra sur le document imprimé"
              placeholder="Ex: LISTE DES AGENTS DU SERVICE TECHNIQUE - 2025"
              value={customObject}
              onChange={(e) => setCustomObject(e.currentTarget.value)}
              minRows={3}
              maxRows={5}
              size="md"
              radius="md"
              autosize
            />
            
            <Text size="xs" c="dimmed">
              Si vous laissez vide, l'objet par défaut "LISTE DES AGENTS" sera utilisé.
            </Text>
            
            <Divider />
            
            <Group justify="space-between" mt="md">
              <Button variant="light" onClick={() => setPrintCustomObjectModalOpen(false)} radius="md">
                Annuler
              </Button>
              <Button 
                type="submit"
                variant="gradient" 
                gradient={{ from: '#1b365d', to: '#295080' }} 
                leftSection={<IconPrinter size={18} />}
                radius="md"
              >
                Imprimer
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}