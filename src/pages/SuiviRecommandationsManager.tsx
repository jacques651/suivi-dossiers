// src/components/SuiviRecommandationsManager.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Container, Stack, Card, Text, Group, Button, Modal,
  TextInput, Textarea, Select, Badge, ActionIcon, Tooltip, Divider,
  ScrollArea, Table, Pagination, Center, LoadingOverlay,
  Paper, Grid, Menu, Progress,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconEdit, IconEye, IconSearch, IconRefresh,
  IconInfoCircle, IconDeviceFloppy, 
  IconDownload, IconFileExcel,
  IconPrinter, IconCheck, IconClock, IconAlertCircle,
  IconProgressCheck, IconCalendar, IconUser, IconFileDescription,
  IconX
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
      case 'Abandonnée': return 'red';
      default: return 'gray';
    }
  };

  const getNiveauIcon = (niveau?: string) => {
    switch (niveau) {
      case 'Réalisée': return <IconCheck size={14} />;
      case 'En cours': return <IconProgressCheck size={14} />;
      case 'En retard': return <IconAlertCircle size={14} />;
      case 'Abandonnée': return <IconX size={14} />;
      default: return <IconClock size={14} />;
    }
  };

  const getAppreciationColor = (appreciation?: string) => {
    switch (appreciation) {
      case 'Satisfaisant': return 'green';
      case 'Partiellement satisfaisant': return 'yellow';
      case 'Non satisfaisant': return 'red';
      default: return 'gray';
    }
  };

  const filtered = suivis.filter(s => {
    const match = (s.TexteRecommandation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.Services || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.NumeroRecommandation || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchNiveau = !filterNiveau || s.NiveauMiseEnOeuvre === filterNiveau;
    return match && matchNiveau;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const data = filtered.map(s => ({
        'N° Reco': s.NumeroRecommandation || '',
        'Recommandation': s.TexteRecommandation || '',
        'Niveau': s.NiveauMiseEnOeuvre || '',
        'Début': s.DateDebut ? new Date(s.DateDebut).toLocaleDateString('fr-FR') : '',
        'Fin': s.DateFin ? new Date(s.DateFin).toLocaleDateString('fr-FR') : '',
        'Mesures': s.MesuresCorrectives || '',
        'Appréciation': s.AppreciationControle || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 15 }];
      const wb = XLSX.utils.book_new(); 
      XLSX.utils.book_append_sheet(wb, ws, 'Suivis');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const path = await save({ 
        filters: [{ name: 'Excel', extensions: ['xlsx'] }], 
        defaultPath: `suivis_recommandations_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx` 
      });
      if (path) { 
        await writeFile(path, new Uint8Array(buf)); 
        notifications.show({ title: '✅ Succès', message: 'Export Excel réussi !', color: 'green' }); 
      }
    } catch (error) {
      notifications.show({ title: '❌ Erreur', message: "Erreur lors de l'export Excel", color: 'red' });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = (orientation: 'portrait' | 'landscape') => {
    const cleanText = (text: string | undefined): string => {
      if (!text) return '-';
      let cleaned = text.replace(/<[^>]*>/g, '');
      cleaned = cleaned.replace(/&nbsp;/g, ' ');
      if (cleaned.length > 150) {
        cleaned = cleaned.substring(0, 150) + '...';
      }
      return cleaned;
    };

    const columns = ['N°', 'N° Reco', 'Recommandation', 'Niveau', 'Début', 'Fin', 'Mesures', 'Appréciation'];
    const rows = filtered.map((s, i) => [
      (i + 1).toString(),
      s.NumeroRecommandation || s.RecommandationID.toString(),
      cleanText(s.TexteRecommandation),
      s.NiveauMiseEnOeuvre || 'Non commencé',
      s.DateDebut ? new Date(s.DateDebut).toLocaleDateString('fr-FR') : '-',
      s.DateFin ? new Date(s.DateFin).toLocaleDateString('fr-FR') : '-',
      cleanText(s.MesuresCorrectives),
      s.AppreciationControle || '-'
    ]);

    const tableHtml = `
      <div style="margin: 20px 0; font-weight: bold; font-size: 14px;">OBJET : SUIVI DES RECOMMANDATIONS</div>
      <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #1b365d; color: white;">
            ${columns.map(col => `<th style="border: 1px solid #2a4a7a; padding: 10px; text-align: center;">${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr style="border: 1px solid #ddd;">
              ${row.map((cell, idx) => {
                const style = idx === 2 ? 'style="text-align: left; padding: 8px;"' : 'style="text-align: center; padding: 8px;"';
                return `<td ${style}>${cell || '-'}</td>`;
              }).join('')}
            </table>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 15px; text-align: right; font-weight: bold;">
        Total : ${filtered.length} suivi(s)
      </div>
    `;

    const signataire = {
      Nom: 'GUIGMA',
      Prenom: 'Windongoudi Hamadou',
      Grade: 'Inspecteur Général de Police',
      Fonction: "L'Inspecteur Général des Services",
      TitreHonorifique: 'Officier de l\'Ordre de l\'Étalon'
    };

    const destinataire = {
      Nom: 'Monsieur le Ministre de la Sécurité',
      Fonction: ''
    };

    printDocument(tableHtml, 'Suivi des recommandations', orientation, true, signataire, destinataire, { effectif: filtered.length });
  };

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <LoadingOverlay visible />
        <Text>Chargement...</Text>
      </Center>
    );
  }

  const totalRecommandations = suivis.length;
  const realisees = suivis.filter(s => s.NiveauMiseEnOeuvre === 'Réalisée').length;
  const enCours = suivis.filter(s => s.NiveauMiseEnOeuvre === 'En cours').length;
  const enRetard = suivis.filter(s => s.NiveauMiseEnOeuvre === 'En retard').length;
  const abandonnees = suivis.filter(s => s.NiveauMiseEnOeuvre === 'Abandonnée').length;
  const tauxRealisation = totalRecommandations > 0 ? (realisees / totalRecommandations) * 100 : 0;

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          <PageHeader title="Suivi des Recommandations" />

          {/* Cartes Statistiques améliorées */}
          <Card withBorder radius="lg" p="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Group justify="space-between" align="flex-end">
                  <Box>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Progression globale</Text>
                    <Group gap="xs" align="baseline">
                      <Text fw={800} size="xl">{tauxRealisation.toFixed(1)}%</Text>
                      <Text size="sm" c="dimmed">des recommandations réalisées</Text>
                    </Group>
                    <Progress value={tauxRealisation} size="sm" radius="xl" color="green" mt={8} w={250} />
                  </Box>
                  <Group gap="xl">
                    <Box ta="center">
                      <Text fw={700} size="xl">{totalRecommandations}</Text>
                      <Text size="xs" c="dimmed">Total</Text>
                    </Box>
                    <Box ta="center">
                      <Text fw={700} size="xl" c="green">{realisees}</Text>
                      <Text size="xs" c="dimmed">Réalisées</Text>
                    </Box>
                    <Box ta="center">
                      <Text fw={700} size="xl" c="blue">{enCours}</Text>
                      <Text size="xs" c="dimmed">En cours</Text>
                    </Box>
                    <Box ta="center">
                      <Text fw={700} size="xl" c="orange">{enRetard}</Text>
                      <Text size="xs" c="dimmed">En retard</Text>
                    </Box>
                    <Box ta="center">
                      <Text fw={700} size="xl" c="red">{abandonnees}</Text>
                      <Text size="xs" c="dimmed">Abandonnées</Text>
                    </Box>
                  </Group>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <SuiviRecommandationStatCards suivis={suivis} />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Filtres améliorés */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
              <Group grow style={{ flex: 2 }}>
                <TextInput 
                  placeholder="Rechercher par numéro, texte ou service..." 
                  leftSection={<IconSearch size={16} />} 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  size="sm"
                />
                <Select 
                  placeholder="Filtrer par niveau" 
                  data={[
                    { value: 'Non commencé', label: '⚪ Non commencé' },
                    { value: 'En cours', label: '🔄 En cours' },
                    { value: 'Réalisée', label: '✅ Réalisée' },
                    { value: 'En retard', label: '⚠️ En retard' },
                    { value: 'Abandonnée', label: '❌ Abandonnée' }
                  ]} 
                  value={filterNiveau} 
                  onChange={setFilterNiveau} 
                  clearable 
                  size="sm"
                />
              </Group>

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
                    <Menu.Item leftSection={<IconFileExcel size={16} color="#00a84f" />} onClick={exportExcel}>
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
                  <ActionIcon variant="light" color="gray" size="lg" onClick={() => setInfoModalOpen(true)}>
                    <IconInfoCircle size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <Divider my="md" />

            {(searchTerm || filterNiveau) && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed">{filtered.length} suivi(s) trouvé(s)</Text>
                <Button variant="subtle" size="xs" onClick={() => { setSearchTerm(''); setFilterNiveau(null); }}>
                  Effacer les filtres
                </Button>
              </Group>
            )}
          </Card>

          {/* Tableau amélioré */}
          <Card withBorder radius="lg" p={0} style={{ overflow: 'hidden' }}>
            <ScrollArea style={{ maxHeight: 550 }}>
              <Table striped highlightOnHover style={{ fontSize: '13px' }}>
                <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: 'white', width: '100px' }}>N° Reco</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Recommandation</Table.Th>
                    <Table.Th style={{ color: 'white', width: '120px' }}>Niveau</Table.Th>
                    <Table.Th style={{ color: 'white', width: '100px' }}>Début</Table.Th>
                    <Table.Th style={{ color: 'white', width: '100px' }}>Fin</Table.Th>
                    <Table.Th style={{ color: 'white', width: '120px' }}>Appréciation</Table.Th>
                    <Table.Th style={{ color: 'white', width: '100px', textAlign: 'center' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginated.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Center py={50}>
                          <Stack align="center" gap="xs">
                            <IconFileDescription size={48} color="gray" />
                            <Text c="dimmed" size="lg">Aucun suivi trouvé</Text>
                            <Text size="xs" c="dimmed">Aucune recommandation avec suivi pour le moment</Text>
                          </Stack>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginated.map((s) => (
                      <Table.Tr key={s.SuiviID || s.RecommandationID} style={{ verticalAlign: 'top' }}>
                        <Table.Td>
                          <Badge variant="gradient" gradient={{ from: '#1b365d', to: '#295080' }} size="md">
                            {s.NumeroRecommandation || `REC-${s.RecommandationID}`}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text size="sm" fw={500} lineClamp={2}>{s.TexteRecommandation || '-'}</Text>
                            {s.ResponsableMiseEnOeuvre && (
                              <Group gap={4}>
                                <IconUser size={12} color="#868e96" />
                                <Text size="xs" c="dimmed">{s.ResponsableMiseEnOeuvre}</Text>
                              </Group>
                            )}
                            {s.MesuresCorrectives && (
                              <Text size="xs" c="dimmed" lineClamp={1}>📋 {s.MesuresCorrectives}</Text>
                            )}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge 
                            color={getNiveauColor(s.NiveauMiseEnOeuvre)} 
                            variant="light" 
                            size="md"
                            leftSection={getNiveauIcon(s.NiveauMiseEnOeuvre)}
                          >
                            {s.NiveauMiseEnOeuvre || 'Non commencé'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {s.DateDebut ? (
                            <Group gap={4}>
                              <IconCalendar size={12} color="#868e96" />
                              <Text size="sm">{new Date(s.DateDebut).toLocaleDateString('fr-FR')}</Text>
                            </Group>
                          ) : (
                            <Text c="dimmed" size="sm">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {s.DateFin ? (
                            <Group gap={4}>
                              <IconCalendar size={12} color="#868e96" />
                              <Text size="sm">{new Date(s.DateFin).toLocaleDateString('fr-FR')}</Text>
                            </Group>
                          ) : (
                            <Text c="dimmed" size="sm">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {s.AppreciationControle ? (
                            <Badge color={getAppreciationColor(s.AppreciationControle)} variant="light" size="md">
                              {s.AppreciationControle}
                            </Badge>
                          ) : (
                            <Text c="dimmed" size="sm">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="center">
                            <Tooltip label="Voir détails">
                              <ActionIcon 
                                variant="light" 
                                color="blue" 
                                size="md" 
                                onClick={() => { setSelectedSuivi(s); openViewModal(); }}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Modifier le suivi">
                              <ActionIcon 
                                variant="light" 
                                color="orange" 
                                size="md" 
                                onClick={() => openEditModal(s)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            {totalPages > 1 && (
              <Group justify="center" p="md">
                <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} color="#1b365d" size="md" />
              </Group>
            )}
          </Card>

          {/* Modal Formulaire */}
          <Modal opened={modalOpened} onClose={() => { closeModal(); resetForm(); }} title={editingSuivi ? 'Modifier le suivi' : 'Nouveau suivi'} size="lg" centered>
            <Stack gap="md">
              <Select 
                label="Niveau de mise en œuvre" 
                data={['Non commencé', 'En cours', 'Réalisée', 'En retard', 'Abandonnée']} 
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
                <Button variant="light" onClick={() => { closeModal(); resetForm(); }}>Annuler</Button>
                <Button onClick={handleSave} leftSection={<IconDeviceFloppy size={16} />}>Enregistrer</Button>
              </Group>
            </Stack>
          </Modal>

          {/* Modal Voir détails améliorée */}
          <Modal opened={viewModalOpened} onClose={() => { closeViewModal(); setSelectedSuivi(null); }} title="Détails du suivi" size="lg" centered>
            {selectedSuivi && (
              <Stack gap="md">
                <Card withBorder style={{ background: 'linear-gradient(135deg, #1b365d 0%, #295080 100%)' }}>
                  <Group justify="space-between">
                    <Badge size="lg" variant="white" color="blue">
                      {selectedSuivi.NumeroRecommandation || `REC-${selectedSuivi.RecommandationID}`}
                    </Badge>
                    <Badge size="lg" color={getNiveauColor(selectedSuivi.NiveauMiseEnOeuvre)} variant="filled">
                      {selectedSuivi.NiveauMiseEnOeuvre || 'Non commencé'}
                    </Badge>
                  </Group>
                </Card>

                <Paper p="md" withBorder>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Recommandation</Text>
                  <Text size="sm">{selectedSuivi.TexteRecommandation}</Text>
                </Paper>

                <Grid>
                  <Grid.Col span={6}>
                    <Paper p="md" withBorder>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Dates</Text>
                      <Group mt={4}>
                        <Text size="sm">📅 Début: {selectedSuivi.DateDebut ? new Date(selectedSuivi.DateDebut).toLocaleDateString('fr-FR') : '-'}</Text>
                        <Text size="sm">📅 Fin: {selectedSuivi.DateFin ? new Date(selectedSuivi.DateFin).toLocaleDateString('fr-FR') : '-'}</Text>
                      </Group>
                    </Paper>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Paper p="md" withBorder>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Appréciation</Text>
                      <Badge color={getAppreciationColor(selectedSuivi.AppreciationControle)} size="md" mt={4}>
                        {selectedSuivi.AppreciationControle || '-'}
                      </Badge>
                    </Paper>
                  </Grid.Col>
                </Grid>

                {selectedSuivi.MesuresCorrectives && (
                  <Paper p="md" withBorder>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Mesures correctives</Text>
                    <Text size="sm" mt={4}>{selectedSuivi.MesuresCorrectives}</Text>
                  </Paper>
                )}

                {(selectedSuivi.ObservationDelai || selectedSuivi.ObservationMiseEnOeuvre) && (
                  <Grid>
                    {selectedSuivi.ObservationDelai && (
                      <Grid.Col span={6}>
                        <Paper p="md" withBorder>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Observation délai</Text>
                          <Text size="sm" mt={4}>{selectedSuivi.ObservationDelai}</Text>
                        </Paper>
                      </Grid.Col>
                    )}
                    {selectedSuivi.ObservationMiseEnOeuvre && (
                      <Grid.Col span={6}>
                        <Paper p="md" withBorder>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Observation mise en œuvre</Text>
                          <Text size="sm" mt={4}>{selectedSuivi.ObservationMiseEnOeuvre}</Text>
                        </Paper>
                      </Grid.Col>
                    )}
                  </Grid>
                )}

                {selectedSuivi.ReferenceJustificatif && (
                  <Paper p="md" withBorder>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Référence justificatif</Text>
                    <Text size="sm" mt={4}>{selectedSuivi.ReferenceJustificatif}</Text>
                  </Paper>
                )}

                <Group justify="flex-end">
                  <Button variant="light" onClick={() => { closeViewModal(); setSelectedSuivi(null); }}>Fermer</Button>
                  <Button 
                    variant="gradient" 
                    gradient={{ from: '#1b365d', to: '#295080' }}
                    onClick={() => {
                      closeViewModal();
                      openEditModal(selectedSuivi);
                    }}
                  >
                    Modifier le suivi
                  </Button>
                </Group>
              </Stack>
            )}
          </Modal>

          {/* Modal Instructions */}
          <Modal opened={infoModalOpen} onClose={() => setInfoModalOpen(false)} title="📋 Instructions" size="md" centered>
            <Stack gap="md">
              <Paper p="md" withBorder bg="blue.0">
                <Text fw={600} size="sm" mb="md">📌 Fonctionnalités :</Text>
                <Stack gap="xs">
                  <Text size="sm">1️⃣ Chaque recommandation a un suivi intégré</Text>
                  <Text size="sm">2️⃣ Mettez à jour le niveau de mise en œuvre régulièrement</Text>
                  <Text size="sm">3️⃣ Ajoutez les mesures correctives prises</Text>
                  <Text size="sm">4️⃣ Évaluez l'appréciation du contrôle effectué</Text>
                  <Text size="sm">5️⃣ Exportez la liste au format Excel pour analyse</Text>
                  <Text size="sm">6️⃣ Imprimez les rapports de suivi en portrait ou paysage</Text>
                </Stack>
              </Paper>
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