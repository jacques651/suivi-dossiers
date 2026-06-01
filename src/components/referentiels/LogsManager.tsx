// src/components/referentiels/LogsManager.tsx
import { useEffect, useState } from 'react';
import {
  Card, Table, Text, Group, Badge, Stack, 
  ScrollArea, TextInput, Select, Button, 
  Center, Loader, Pagination, Box, Paper,
  Container, Divider, ThemeIcon, Transition
} from '@mantine/core';
import { 
  IconSearch, IconHistory, IconX,
  IconUser, IconTable,
  IconCalendar, IconFileDescription
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import PageHeader from '../PageHeader';

export interface Log {
  LogID: number;
  Utilisateur: string;
  Action: string;
  TableConcernee: string;
  EnregistrementID?: number;
  AnciennesValeurs?: string;
  NouvellesValeurs?: string;
  AdresseIP?: string;
  DateLog: string;
  Details?: string;
}

export default function LogsManager() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string | null>(null);
  const [filterTable, setFilterTable] = useState<string | null>(null);
  const [filterUtilisateur, setFilterUtilisateur] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [utilisateurs, setUtilisateurs] = useState<string[]>([]);
  const itemsPerPage = 15;

  // Options pour les filtres
  const actionOptions = [
    { value: 'CREATE', label: '➕ Création' },
    { value: 'UPDATE', label: '✏️ Modification' },
    { value: 'DELETE', label: '🗑️ Suppression' },
    { value: 'LOGIN', label: '🔐 Connexion' },
    { value: 'LOGOUT', label: '🚪 Déconnexion' },
    { value: 'EXPORT', label: '📤 Export' },
    { value: 'IMPORT', label: '📥 Import' }
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_logs_with_users', { limit: 500 });
      const logsData = result as Log[];
      setLogs(logsData);
      
      // Extraire les utilisateurs uniques pour le filtre
      const uniqueUsers = [...new Set(logsData.map(l => l.Utilisateur).filter(Boolean))];
      setUtilisateurs(uniqueUsers as string[]);
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Impossible de charger l\'historique', 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'CREATE': return 'green';
      case 'UPDATE': return 'blue';
      case 'DELETE': return 'red';
      case 'LOGIN': return 'teal';
      case 'LOGOUT': return 'gray';
      case 'EXPORT': return 'indigo';
      case 'IMPORT': return 'violet';
      default: return 'gray';
    }
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      case 'LOGIN': return '🔐';
      case 'LOGOUT': return '🚪';
      case 'EXPORT': return '📤';
      case 'IMPORT': return '📥';
      default: return '📝';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = searchTerm === '' || 
      log.Utilisateur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.Action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.TableConcernee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.Details?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchAction = !filterAction || log.Action === filterAction;
    const matchTable = !filterTable || log.TableConcernee === filterTable;
    const matchUtilisateur = !filterUtilisateur || log.Utilisateur === filterUtilisateur;
    
    return matchSearch && matchAction && matchTable && matchUtilisateur;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setSearchTerm('');
    setFilterAction(null);
    setFilterTable(null);
    setFilterUtilisateur(null);
    setCurrentPage(1);
  };

  // Statistiques
  const totalLogs = logs.length;
  const createCount = logs.filter(l => l.Action === 'CREATE').length;
  const updateCount = logs.filter(l => l.Action === 'UPDATE').length;
  const deleteCount = logs.filter(l => l.Action === 'DELETE').length;
  const loginCount = logs.filter(l => l.Action === 'LOGIN').length;

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement de l'historique...</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Box style={{ background: '#f8f9fa', minHeight: '100vh' }} p="md">
      <Container size="full" fluid>
        <Stack gap="xl">
          {/* En-tête avec PageHeader */}
          <PageHeader 
            title="Suivi des modifications"
            subtitle={`${totalLogs} actions enregistrées • ${utilisateurs.length} utilisateurs actifs`}
          />

          {/* Cartes statistiques */}
          <Transition mounted={true} transition="slide-down" duration={500}>
            {(styles) => (
              <div style={styles}>
                <Card withBorder radius="lg" p="md">
                  <Group justify="space-around" wrap="wrap" gap="md">
                    <Box ta="center">
                      <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                        <IconHistory size={20} />
                      </ThemeIcon>
                      <Text fw={700} size="xl" mt={4}>{totalLogs}</Text>
                      <Text size="xs" c="dimmed">Total actions</Text>
                    </Box>
                    <Box ta="center">
                      <ThemeIcon size="lg" radius="md" color="green" variant="light">
                        <span style={{ fontSize: 20 }}>➕</span>
                      </ThemeIcon>
                      <Text fw={700} size="xl" mt={4}>{createCount}</Text>
                      <Text size="xs" c="dimmed">Créations</Text>
                    </Box>
                    <Box ta="center">
                      <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                        <span style={{ fontSize: 20 }}>✏️</span>
                      </ThemeIcon>
                      <Text fw={700} size="xl" mt={4}>{updateCount}</Text>
                      <Text size="xs" c="dimmed">Modifications</Text>
                    </Box>
                    <Box ta="center">
                      <ThemeIcon size="lg" radius="md" color="red" variant="light">
                        <span style={{ fontSize: 20 }}>🗑️</span>
                      </ThemeIcon>
                      <Text fw={700} size="xl" mt={4}>{deleteCount}</Text>
                      <Text size="xs" c="dimmed">Suppressions</Text>
                    </Box>
                    <Box ta="center">
                      <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                        <span style={{ fontSize: 20 }}>🔐</span>
                      </ThemeIcon>
                      <Text fw={700} size="xl" mt={4}>{loginCount}</Text>
                      <Text size="xs" c="dimmed">Connexions</Text>
                    </Box>
                  </Group>
                </Card>
              </div>
            )}
          </Transition>

          {/* Filtres */}
          <Transition mounted={true} transition="slide-down" duration={550}>
            {(styles) => (
              <Card withBorder radius="lg" shadow="sm" p="md" style={styles}>
                <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                  <Group grow style={{ flex: 2 }}>
                    <TextInput
                      placeholder="Rechercher par utilisateur, action, table..."
                      leftSection={<IconSearch size={16} />}
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.currentTarget.value); setCurrentPage(1); }}
                      size="sm"
                    />
                    <Select
                      placeholder="Filtrer par action"
                      data={actionOptions}
                      value={filterAction}
                      onChange={setFilterAction}
                      clearable
                      size="sm"
                    />
                    <Select
                      placeholder="Filtrer par table"
                      data={[
                        'Agent', 'Rapport', 'Dossier', 'Recommandation', 'SuiviRecommandation',
                        'Grade', 'Sanction', 'ServiceInvestigation', 'Signataire',
                        'ParametresGeneraux', 'EnteteDocument', 'Utilisateur'
      ]}
                      value={filterTable}
                      onChange={setFilterTable}
                      clearable
                      size="sm"
                    />
                    <Select
                      placeholder="Filtrer par utilisateur"
                      data={utilisateurs}
                      value={filterUtilisateur}
                      onChange={setFilterUtilisateur}
                      clearable
                      searchable
                      size="sm"
                    />
                  </Group>

                  {(searchTerm || filterAction || filterTable || filterUtilisateur) && (
                    <Button 
                      variant="subtle" 
                      size="sm" 
                      onClick={resetFilters}
                      leftSection={<IconX size={14} />}
                    >
                      Effacer les filtres
                    </Button>
                  )}
                </Group>

                <Divider my="md" />

                {/* Résumé des filtres */}
                {(searchTerm || filterAction || filterTable || filterUtilisateur) && (
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {filteredLogs.length} résultat(s) trouvé(s)
                    </Text>
                    <Button variant="subtle" size="xs" onClick={resetFilters}>
                      Effacer tous les filtres
                    </Button>
                  </Group>
                )}
              </Card>
            )}
          </Transition>

          {/* Tableau des logs */}
          <Transition mounted={true} transition="fade" duration={600}>
            {(styles) => (
              <Card withBorder radius="lg" shadow="sm" p={0} style={{ overflow: 'hidden', ...styles }}>
                <ScrollArea style={{ maxHeight: 550 }}>
                  <Table striped highlightOnHover style={{ fontSize: '12px' }}>
                    <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: 'white', width: '160px' }}>Date</Table.Th>
                        <Table.Th style={{ color: 'white', width: '120px' }}>Utilisateur</Table.Th>
                        <Table.Th style={{ color: 'white', width: '110px' }}>Action</Table.Th>
                        <Table.Th style={{ color: 'white', width: '150px' }}>Table</Table.Th>
                        <Table.Th style={{ color: 'white' }}>Détails / Modifications</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedLogs.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={5}>
                            <Center py={50}>
                              <Stack align="center" gap="xs">
                                <IconFileDescription size={48} color="gray" />
                                <Text c="dimmed" size="lg">Aucun historique trouvé</Text>
                                <Text size="xs" c="dimmed">Aucune action enregistrée pour le moment</Text>
                              </Stack>
                            </Center>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        paginatedLogs.map((log) => (
                          <Table.Tr key={log.LogID}>
                            <Table.Td>
                              <Group gap={4} wrap="nowrap">
                                <IconCalendar size={12} color="#868e96" />
                                <Text size="xs" fw={500}>{formatDate(log.DateLog)}</Text>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" color="cyan" size="sm" leftSection={<IconUser size={12} />}>
                                {log.Utilisateur || 'System'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge 
                                color={getActionColor(log.Action)} 
                                variant="filled" 
                                size="sm"
                                leftSection={getActionIcon(log.Action)}
                              >
                                {log.Action}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={4} wrap="nowrap">
                                <IconTable size={12} color="#868e96" />
                                <Text size="xs" fw={500}>{log.TableConcernee}</Text>
                              </Group>
                              {log.EnregistrementID && (
                                <Text size="xs" c="dimmed">ID: {log.EnregistrementID}</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={4}>
                                {log.Details && (
                                  <Text size="xs" lineClamp={2}>{log.Details}</Text>
                                )}
                                {log.AnciennesValeurs && (
                                  <Paper p="xs" withBorder bg="red.0" radius="sm">
                                    <Group gap={4} wrap="nowrap">
                                      <Text size="xs" c="red" fw={600}>Avant :</Text>
                                      <Text size="xs" c="dimmed" lineClamp={1}>{log.AnciennesValeurs}</Text>
                                    </Group>
                                  </Paper>
                                )}
                                {log.NouvellesValeurs && (
                                  <Paper p="xs" withBorder bg="green.0" radius="sm">
                                    <Group gap={4} wrap="nowrap">
                                      <Text size="xs" c="green" fw={600}>Après :</Text>
                                      <Text size="xs" c="dimmed" lineClamp={1}>{log.NouvellesValeurs}</Text>
                                    </Group>
                                  </Paper>
                                )}
                              </Stack>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </Transition>

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination 
                total={totalPages} 
                value={currentPage} 
                onChange={setCurrentPage} 
                color="#1b365d" 
                size="md" 
                radius="md"
              />
            </Group>
          )}
        </Stack>
      </Container>
    </Box>
  );
}