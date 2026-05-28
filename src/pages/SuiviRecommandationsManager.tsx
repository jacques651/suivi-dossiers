// src/components/SuiviRecommandationsManager.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Container, Stack, Card, Text, Group, Button, Modal,
  TextInput, Textarea, Select, Badge, ActionIcon, Tooltip, Divider,
  ScrollArea, Table, Pagination, Center, LoadingOverlay,
  Paper, Grid, Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconEdit, IconEye, IconSearch, IconRefresh,
  IconInfoCircle, IconDeviceFloppy, 
  IconDownload, IconFileExcel,
  IconPrinter
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { usePrint } from '../hooks/usePrint';
import SuiviRecommandationStatCards from './SuiviRecommandationStatCards';
import PageHeader from '../components/PageHeader';

export interface SuiviRecommandation {
  SuiviID: number;
  RecommandationID: number;
  MesuresCorrectives?: string;
  DateDebut?: string;
  DateFin?: string;
  NiveauMiseEnOeuvre?: string;
  ObservationDelai?: string;
  ObservationMiseEnOeuvre?: string;
  AppreciationControle?: string;
  ReferenceJustificatif?: string;
  // Jointure
  TexteRecommandation?: string;
  NumeroRecommandation?: string;
  Echeance?: string;
  Services?: string;
  ResponsableMiseEnOeuvre?: string;
}

const SuiviRecommandationsManager: React.FC = () => {
  const [suivis, setSuivis] = useState<SuiviRecommandation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNiveau, setFilterNiveau] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSuivi, setSelectedSuivi] = useState<SuiviRecommandation | null>(null);
  const [editingSuivi, setEditingSuivi] = useState<SuiviRecommandation | null>(null);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const itemsPerPage = 10;

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);
  const { printDocument } = usePrint();
  const [formData, setFormData] = useState({
    RecommandationID: 0,
    MesuresCorrectives: '',
    DateDebut: '',
    DateFin: '',
    NiveauMiseEnOeuvre: 'Non commencé',
    ObservationDelai: '',
    ObservationMiseEnOeuvre: '',
    AppreciationControle: '',
    ReferenceJustificatif: '',
  });

  useEffect(() => { loadSuivis(); }, []);

  const loadSuivis = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_recommandations');
      setSuivis(result as SuiviRecommandation[]);
    } catch (err) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les suivis', color: 'red' });
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({
      RecommandationID: 0, MesuresCorrectives: '', DateDebut: '', DateFin: '',
      NiveauMiseEnOeuvre: 'Non commencé', ObservationDelai: '', ObservationMiseEnOeuvre: '',
      AppreciationControle: '', ReferenceJustificatif: '',
    });
    setEditingSuivi(null);
  };

  const openEditModal = (suivi: SuiviRecommandation) => {
    setEditingSuivi(suivi);
    setFormData({
      RecommandationID: suivi.RecommandationID,
      MesuresCorrectives: suivi.MesuresCorrectives || '',
      DateDebut: suivi.DateDebut || '',
      DateFin: suivi.DateFin || '',
      NiveauMiseEnOeuvre: suivi.NiveauMiseEnOeuvre || 'Non commencé',
      ObservationDelai: suivi.ObservationDelai || '',
      ObservationMiseEnOeuvre: suivi.ObservationMiseEnOeuvre || '',
      AppreciationControle: suivi.AppreciationControle || '',
      ReferenceJustificatif: suivi.ReferenceJustificatif || '',
    });
    openModal();
  };

  const handleSave = async () => {
    if (!formData.RecommandationID) {
      notifications.show({ title: 'Erreur', message: 'Recommandation requise', color: 'red' }); return;
    }
    try {
      await invoke('update_suivi_recommandation', { suivi: formData });
      notifications.show({ title: 'Succès', message: 'Suivi enregistré', color: 'green' });
      closeModal(); resetForm(); loadSuivis();
    } catch (err: any) {
      notifications.show({ title: 'Erreur', message: String(err), color: 'red' });
    }
  };

  const getNiveauColor = (niveau?: string) => {
    switch (niveau) {
      case 'Réalisée': return 'green';
      case 'En cours': return 'blue';
      case 'En retard': return 'orange';
      case 'Bloquée': return 'red';
      default: return 'gray';
    }
  };

  const filtered = suivis.filter(s => {
    const match = (s.TexteRecommandation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.Services || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchNiveau = !filterNiveau || s.NiveauMiseEnOeuvre === filterNiveau;
    return match && matchNiveau;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = async () => {
    setExporting(true);
    const data = filtered.map(s => ({
      'N° Reco': s.NumeroRecommandation || '',
      'Recommandation': s.TexteRecommandation || '',
      'Niveau': s.NiveauMiseEnOeuvre || '',
      'Début': s.DateDebut || '',
      'Fin': s.DateFin || '',
      'Mesures': s.MesuresCorrectives || '',
      'Appréciation': s.AppreciationControle || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Suivis');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const path = await save({ filters: [{ name: 'Excel', extensions: ['xlsx'] }], defaultPath: 'suivis_recommandations.xlsx' });
    if (path) { await writeFile(path, new Uint8Array(buf)); notifications.show({ title: 'Export réussi', message: '', color: 'green' }); }
    setExporting(false);
  };

  if (loading) {
    return <Center style={{ height: '50vh' }}><LoadingOverlay visible /><Text>Chargement...</Text></Center>;
  }

  const handlePrint = (orientation: 'portrait' | 'landscape') => {
    const rows = filtered.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.NumeroRecommandation || s.RecommandationID}</td>
      <td>${s.TexteRecommandation || '-'}</td>
      <td>${s.NiveauMiseEnOeuvre || '-'}</td>
      <td>${s.DateDebut || '-'}</td>
      <td>${s.DateFin || '-'}</td>
      <td>${s.MesuresCorrectives || '-'}</td>
      <td>${s.AppreciationControle || '-'}</td>
    </tr>
    `).join('');

    const content = `
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr style="background:#1b365d;color:white;">
          <th>N°</th>
          <th>Reco</th>
          <th>Recommandation</th>
          <th>Niveau</th>
          <th>Début</th>
          <th>Fin</th>
          <th>Mesures</th>
          <th>Appréciation</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    `;
    printDocument(content, 'SUIVI DES RECOMMANDATIONS', orientation);
  };

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          {/* Header avec PageHeader - sans rightContent */}
          <PageHeader 
            title="Bienvenue dans la page de Suivi des Recommandations"
            
          />

          {/* Cartes Statistiques */}
          <SuiviRecommandationStatCards suivis={suivis} />

          {/* Filtres et Boutons sur la même ligne */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
              {/* Filtres à gauche */}
              <Group grow style={{ flex: 2 }}>
                <TextInput 
                  placeholder="Rechercher par texte ou service..." 
                  leftSection={<IconSearch size={16} />} 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  size="sm"
                />
                <Select 
                  placeholder="Filtrer par niveau" 
                  data={['Non commencé', 'En cours', 'Réalisée', 'En retard', 'Bloquée']} 
                  value={filterNiveau} 
                  onChange={setFilterNiveau} 
                  clearable 
                  size="sm"
                />
              </Group>

              {/* Boutons d'action à droite */}
              <Group gap="sm" align="flex-end">
                <Tooltip label="Actualiser">
                  <ActionIcon variant="light" onClick={loadSuivis} size="lg" color="blue">
                    <IconRefresh size={18} />
                  </ActionIcon>
                </Tooltip>

                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <Button leftSection={<IconDownload size={16} />} variant="outline" loading={exporting}>
                      Exporter
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Format d'export</Menu.Label>
                    <Menu.Item leftSection={<IconFileExcel size={16} color="green" />} onClick={exportExcel}>
                      Excel (.xlsx)
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                <Menu shadow="md" width={160}>
                  <Menu.Target>
                    <Tooltip label="Imprimer">
                      <ActionIcon variant="light" color="teal" size="lg">
                        <IconPrinter size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => handlePrint('portrait')}>🧾 Portrait</Menu.Item>
                    <Menu.Item onClick={() => handlePrint('landscape')}>📄 Paysage</Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                <Tooltip label="Instructions">
                  <ActionIcon 
                    variant="light" 
                    color="gray" 
                    size="lg"
                    onClick={() => setInfoModalOpen(true)}
                  >
                    <IconInfoCircle size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <Divider my="md" />

            {/* Résumé des filtres */}
            {(searchTerm || filterNiveau) && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed">{filtered.length} suivi(s) trouvé(s)</Text>
                <Button variant="subtle" size="xs" onClick={() => { setSearchTerm(''); setFilterNiveau(null); }}>
                  Effacer les filtres
                </Button>
              </Group>
            )}
          </Card>

          {/* Tableau */}
          <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
            <ScrollArea>
              <Table striped highlightOnHover style={{ fontSize: '12px' }}>
                <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                  <Table.Tr>
                    {['N° Reco', 'Recommandation', 'Niveau', 'Début', 'Fin', 'Mesures', 'Appréciation', 'Actions'].map(h => (
                      <Table.Th key={h} style={{ color: 'white', fontSize: '11px', padding: '8px 6px' }}>{h}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginated.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={8} ta="center" py={40}><Text c="dimmed">Aucun suivi trouvé</Text></Table.Td></Table.Tr>
                  ) : paginated.map(s => (
                    <Table.Tr key={s.SuiviID || s.RecommandationID}>
                      <Table.Td><Badge variant="light" size="xs">{s.NumeroRecommandation || s.RecommandationID}</Badge></Table.Td>
                      <Table.Td><Text size="xs" lineClamp={2}>{s.TexteRecommandation || '-'}</Text></Table.Td>
                      <Table.Td><Badge color={getNiveauColor(s.NiveauMiseEnOeuvre)} variant="filled" size="xs">{s.NiveauMiseEnOeuvre || 'Non commencé'}</Badge></Table.Td>
                      <Table.Td><Text size="xs">{s.DateDebut ? new Date(s.DateDebut).toLocaleDateString('fr-FR') : '-'}</Text></Table.Td>
                      <Table.Td><Text size="xs">{s.DateFin ? new Date(s.DateFin).toLocaleDateString('fr-FR') : '-'}</Text></Table.Td>
                      <Table.Td><Text size="xs" lineClamp={1}>{s.MesuresCorrectives || '-'}</Text></Table.Td>
                      <Table.Td><Badge color={s.AppreciationControle === 'Satisfaisant' ? 'green' : s.AppreciationControle === 'Non satisfaisant' ? 'red' : 'orange'} variant="light" size="xs">{s.AppreciationControle || '-'}</Badge></Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Tooltip label="Voir">
                            <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => { setSelectedSuivi(s); openViewModal(); }}>
                              <IconEye size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Modifier">
                            <ActionIcon variant="subtle" color="orange" size="sm" onClick={() => openEditModal(s)}>
                              <IconEdit size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            {totalPages > 1 && <Group justify="center" p="md"><Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} color="#1b365d" /></Group>}
          </Card>

          {/* Modal Formulaire */}
          <Modal opened={modalOpened} onClose={closeModal} title={editingSuivi ? 'Modifier le suivi' : 'Nouveau suivi'} size="lg" centered>
            <Stack gap="md">
              <Select 
                label="Niveau de mise en œuvre" 
                data={['Non commencé', 'En cours', 'Réalisée', 'En retard', 'Bloquée']} 
                value={formData.NiveauMiseEnOeuvre} 
                onChange={(v) => setFormData({ ...formData, NiveauMiseEnOeuvre: v || 'Non commencé' })} 
              />
              <Grid>
                <Grid.Col span={6}>
                  <TextInput 
                    label="Date début" 
                    type="date" 
                    value={formData.DateDebut} 
                    onChange={(e) => setFormData({ ...formData, DateDebut: e.target.value })} 
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput 
                    label="Date fin" 
                    type="date" 
                    value={formData.DateFin} 
                    onChange={(e) => setFormData({ ...formData, DateFin: e.target.value })} 
                  />
                </Grid.Col>
              </Grid>
              <Textarea 
                label="Mesures correctives" 
                value={formData.MesuresCorrectives} 
                onChange={(e) => setFormData({ ...formData, MesuresCorrectives: e.target.value })} 
                minRows={3} 
              />
              <Grid>
                <Grid.Col span={6}>
                  <Textarea 
                    label="Observation délai" 
                    value={formData.ObservationDelai} 
                    onChange={(e) => setFormData({ ...formData, ObservationDelai: e.target.value })} 
                    minRows={2} 
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Textarea 
                    label="Observation mise en œuvre" 
                    value={formData.ObservationMiseEnOeuvre} 
                    onChange={(e) => setFormData({ ...formData, ObservationMiseEnOeuvre: e.target.value })} 
                    minRows={2} 
                  />
                </Grid.Col>
              </Grid>
              <Grid>
                <Grid.Col span={6}>
                  <Select 
                    label="Appréciation" 
                    data={['Satisfaisant', 'Partiellement satisfaisant', 'Non satisfaisant', 'Non évalué']} 
                    value={formData.AppreciationControle} 
                    onChange={(v) => setFormData({ ...formData, AppreciationControle: v || '' })} 
                    clearable 
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput 
                    label="Référence justificatif" 
                    value={formData.ReferenceJustificatif} 
                    onChange={(e) => setFormData({ ...formData, ReferenceJustificatif: e.target.value })} 
                  />
                </Grid.Col>
              </Grid>
              <Group justify="flex-end">
                <Button variant="light" onClick={closeModal}>Annuler</Button>
                <Button onClick={handleSave} leftSection={<IconDeviceFloppy size={16} />}>Enregistrer</Button>
              </Group>
            </Stack>
          </Modal>

          {/* Modal Voir détails */}
          <Modal opened={viewModalOpened} onClose={closeViewModal} title={`Détails du suivi`} size="md" centered>
            {selectedSuivi && (
              <Stack gap="md">
                <Paper p="md" withBorder bg="blue.0">
                  <Text size="xs" fw={600}>Recommandation</Text>
                  <Text size="sm">{selectedSuivi.TexteRecommandation}</Text>
                </Paper>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="xs" c="dimmed">Niveau</Text>
                    <Badge color={getNiveauColor(selectedSuivi.NiveauMiseEnOeuvre)}>{selectedSuivi.NiveauMiseEnOeuvre}</Badge>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Début</Text>
                    <Text size="sm">{selectedSuivi.DateDebut || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Fin</Text>
                    <Text size="sm">{selectedSuivi.DateFin || '-'}</Text>
                  </Grid.Col>
                </Grid>
                {selectedSuivi.MesuresCorrectives && (
                  <Paper p="md" withBorder>
                    <Text size="xs" fw={600}>Mesures</Text>
                    <Text size="sm">{selectedSuivi.MesuresCorrectives}</Text>
                  </Paper>
                )}
                {selectedSuivi.AppreciationControle && (
                  <Paper p="md" withBorder>
                    <Text size="xs" fw={600}>Appréciation</Text>
                    <Text size="sm">{selectedSuivi.AppreciationControle}</Text>
                  </Paper>
                )}
                <Group justify="flex-end">
                  <Button variant="light" onClick={closeViewModal}>Fermer</Button>
                </Group>
              </Stack>
            )}
          </Modal>

          {/* Modal Instructions */}
          <Modal opened={infoModalOpen} onClose={() => setInfoModalOpen(false)} title="📋 Instructions" size="md" centered>
            <Stack gap="md">
              <Text size="sm">1️⃣ Chaque recommandation a un suivi</Text>
              <Text size="sm">2️⃣ Mettez à jour le niveau de mise en œuvre</Text>
              <Text size="sm">3️⃣ Ajoutez les mesures correctives</Text>
              <Text size="sm">4️⃣ Évaluez l'appréciation du contrôle</Text>
              <Divider />
              <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - BD-SDI</Text>
            </Stack>
          </Modal>
        </Stack>
      </Container>
    </Box>
  );
};

export default SuiviRecommandationsManager;