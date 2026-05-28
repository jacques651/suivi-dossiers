// src/pages/agents/AgentManager.tsx
import { useEffect, useState, useRef } from 'react';
import { Stack, Card, Text, Group, Button, Box, Container, Center, Loader, ThemeIcon, Transition, Paper } from '@mantine/core';
import { IconPlus, IconRefresh, IconTrendingUp } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import AgentDeleteModal from './AgentDeleteModal';
import AgentExportMenu from './AgentExportMenu';
import AgentFilters from './AgentFilters';
import AgentFormModal from './AgentFormModal';
import AgentImportModal from './AgentImportModal';
import AgentStatsCards from './AgentStatsCards';
import AgentTable from './AgentTable';
import AgentViewModal from './AgentViewModal';
import PageHeader from '../../components/PageHeader';

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
  const [] = useState(false);

  // États modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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

  // Handlers pour les actions
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

  // Filtrer les agents
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
          {/* En-tête avec PageHeader */}
          <PageHeader 
            title="Gestion des Agents"
            subtitle={`${agents.length} agents • ${serviceOptions.length} services`}
            rightContent={
              <Group gap="md">
                <Button
                  variant="light"
                  color="white"
                  leftSection={<IconRefresh size={18} />}
                  onClick={loadAgents}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  }}
                >
                  Actualiser
                </Button>

                <AgentExportMenu
                  agents={filteredAgents}
                  grades={grades}
                  onImport={() => setImportModalOpen(true)}
                />

                <Button
                  variant="white"
                  color="dark"
                  leftSection={<IconPlus size={18} />}
                  onClick={handleAdd}
                  style={{
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                >
                  Nouvel Agent
                </Button>
              </Group>
            }
          />

          {/* Statistiques */}
          <Transition mounted={true} transition="slide-down" duration={500} timingFunction="ease">
            {(styles) => (
              <div style={styles}>
                <AgentStatsCards agents={agents} />
              </div>
            )}
          </Transition>

          {/* Filtres */}
          <Transition mounted={true} transition="slide-down" duration={550} timingFunction="ease">
            {(styles) => (
              <div style={styles}>
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
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedSexe(null);
                        setSelectedService(null);
                        setSelectedEntite(null);
                      }}
                    >
                      Effacer tous les filtres
                    </Button>
                  </Group>
                </Card>
              )}
            </Transition>
          )}

          {/* Tableau */}
          <Transition mounted={true} transition="fade" duration={600} timingFunction="ease">
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

      <AgentImportModal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={handleImported}
      />
    </Box>
  );
}