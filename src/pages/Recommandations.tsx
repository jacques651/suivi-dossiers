import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Title, Card,
  Group, ActionIcon, Select, Textarea, Grid, Badge,
  Avatar, Text, Divider, Loader, Pagination, Tooltip,
  Box, Container, Paper,
  ScrollArea, Center, Alert, Menu,
  Autocomplete,
  Transition} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import {
  IconEdit,
  IconPlus,
  IconCheck,
  IconSearch,
  IconListCheck,
  IconUser,
  IconRefresh,
  IconDownload,
  IconPrinter,
  IconFileExcel,
  IconFile,
  IconFileWord,
  IconInfoCircle,
  IconX,
  IconTrash,
  IconEye
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePrint } from '../hooks/usePrint';
import RecommandationsStatCards from './RecommandationsStatCards';

export interface Recommandation {
  RecommandationID: number;
  Services?: string;
  Source?: string;
  RapportID: number;
  ProblemeFaiblesse?: string;
  NumeroRecommandation?: string;
  TexteRecommandation: string;
  ResponsableMiseEnOeuvre?: string;
  ActeursImpliques?: string;
  InstanceValidation?: string;
  Echeance?: string;
  Domaine?: string;
  NiveauMiseEnOeuvre?: string;
  DateDebut?: string;
  DateFin?: string;
  MesuresCorrectives?: string;
  ObservationDelai?: string;
  ObservationMiseEnOeuvre?: string;
  AppreciationControle?: string;
  NumeroRapport?: string;
  LibelleRapport?: string;
}

interface Rapport {
  RapportID: number;
  NumeroRapport: string;
  LibelleRapport: string;
}

export default function Recommandations() {
  const [recommandations, setRecommandations] = useState<Recommandation[]>([]);
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [suiviModalOpen, setSuiviModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRecommandation, setSelectedRecommandation] = useState<Recommandation | null>(null);
  const [recommandationToDelete, setRecommandationToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [itemsPerPage] = useState(10);
  const [domaineOptions, setDomaineOptions] = useState<string[]>([]);
  const [currentDomaineInput, setCurrentDomaineInput] = useState('');

  const { printDocument } = usePrint();

  const form = useForm({
    initialValues: {
      Services: '',
      Source: '',
      RapportID: '',
      ProblemeFaiblesse: '',
      NumeroRecommandation: '',
      TexteRecommandation: '',
      ResponsableMiseEnOeuvre: '',
      ActeursImpliques: '',
      InstanceValidation: '',
      Echeance: '',
      Domaine: '',
    },
    validate: {
      RapportID: (value) => (value ? null : 'Le rapport est requis'),
      TexteRecommandation: (value) => (value ? null : 'Le texte de la recommandation est requis'),
    },
  });

  const suiviForm = useForm({
    initialValues: {
      NiveauMiseEnOeuvre: 'Non commencé',
      DateDebut: null as Date | null,
      DateFin: null as Date | null,
      MesuresCorrectives: '',
      ObservationDelai: '',
      ObservationMiseEnOeuvre: '',
      AppreciationControle: '',
      ReferenceJustificatif: '',
    },
  });

  useEffect(() => {
    loadRecommandations();
    loadRapports();
    loadDomainesExistants();
  }, []);

  const loadRecommandations = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_recommandations');
      setRecommandations(result as Recommandation[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les recommandations', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const loadRapports = async () => {
    try {
      const result = await invoke('get_rapports');
      setRapports(result as Rapport[]);
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    }
  };

const loadDomainesExistants = async () => {
  try {
    // Changez 'get_distinct_domaines_from_recommandations' par 'get_distinct_domaines'
    const domaines = await invoke<string[]>('get_distinct_domaines');
    if (domaines && domaines.length > 0) {
      setDomaineOptions(domaines);
    } else {
      setDomaineOptions([]);
    }
  } catch (error) {
    console.error('Erreur chargement domaines:', error);
    setDomaineOptions([]);
  }
};
  const addNewDomaine = async (nouveauDomaine: string) => {
    if (!nouveauDomaine || nouveauDomaine.trim() === '') return;

    const domaineTrimmed = nouveauDomaine.trim();

    if (domaineOptions.some(d => d.toLowerCase() === domaineTrimmed.toLowerCase())) {
      notifications.show({
        title: 'Domaine existant',
        message: `"${domaineTrimmed}" existe déjà dans la liste`,
        color: 'yellow',
        icon: <IconInfoCircle size={16} />
      });
      return;
    }

    try {
      try {
        await invoke('add_domaine', { domaine: domaineTrimmed });
      } catch {
        console.log('Table domaines non disponible');
      }

      setDomaineOptions(prev => [...prev, domaineTrimmed]);

      notifications.show({
        title: 'Nouveau domaine ajouté',
        message: `"${domaineTrimmed}" a été ajouté aux options`,
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du domaine:', error);
      setDomaineOptions(prev => [...prev, domaineTrimmed]);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (values.Domaine && values.Domaine.trim() !== '') {
        const domaineExists = domaineOptions.some(
          option => option.toLowerCase() === values.Domaine.toLowerCase()
        );

        if (!domaineExists) {
          setDomaineOptions(prev => [...prev, values.Domaine.trim()]);
        }
      }

      const recommandationData = {
        ...values,
        RapportID: parseInt(values.RapportID),
        Echeance: values.Echeance || null,
        RecommandationID: editingId,
      };

      if (editingId) {
        await invoke('update_recommandation', { recommandation: recommandationData });
        notifications.show({ title: 'Succès', message: 'Recommandation modifiée', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('create_recommandation', { recommandation: recommandationData });
        notifications.show({ title: 'Succès', message: 'Recommandation créée', color: 'green', icon: <IconCheck size={16} /> });
      }

      setModalOpen(false);
      form.reset();
      setCurrentDomaineInput('');
      setEditingId(null);
      loadRecommandations();
      loadDomainesExistants();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleUpdateSuivi = async () => {
    if (!selectedRecommandation) return;

    try {
      const suiviData = {
        ...suiviForm.values,
        RecommandationID: selectedRecommandation.RecommandationID,
        DateDebut: suiviForm.values.DateDebut ? dayjs(suiviForm.values.DateDebut).format('YYYY-MM-DD') : null,
        DateFin: suiviForm.values.DateFin ? dayjs(suiviForm.values.DateFin).format('YYYY-MM-DD') : null,
      };

      await invoke('update_suivi_recommandation', { suivi: suiviData });
      notifications.show({ title: 'Succès', message: 'Suivi mis à jour', color: 'green', icon: <IconCheck size={16} /> });
      setSuiviModalOpen(false);
      loadRecommandations();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: `Erreur: ${error}`, color: 'red', icon: <IconX size={16} /> });
    }
  };

  const handleDelete = async () => {
    if (!recommandationToDelete) return;
    try {
      await invoke('delete_recommandation', { id: recommandationToDelete });
      notifications.show({ title: 'Succès', message: 'Recommandation supprimée', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteModalOpen(false);
      setRecommandationToDelete(null);
      loadRecommandations();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const openSuiviModal = (recommandation: Recommandation) => {
    setSelectedRecommandation(recommandation);
    suiviForm.setValues({
      NiveauMiseEnOeuvre: recommandation.NiveauMiseEnOeuvre || 'Non commencé',
      DateDebut: recommandation.DateDebut ? new Date(recommandation.DateDebut) : null,
      DateFin: recommandation.DateFin ? new Date(recommandation.DateFin) : null,
      MesuresCorrectives: recommandation.MesuresCorrectives || '',
      ObservationDelai: recommandation.ObservationDelai || '',
      ObservationMiseEnOeuvre: recommandation.ObservationMiseEnOeuvre || '',
      AppreciationControle: recommandation.AppreciationControle || '',
      ReferenceJustificatif: '',
    });
    setSuiviModalOpen(true);
  };

  const handleView = (recommandation: Recommandation) => {
    setSelectedRecommandation(recommandation);
    setViewModalOpen(true);
  };

  const getNiveauColor = (niveau?: string) => {
    switch (niveau) {
      case 'Réalisée': return 'green';
      case 'En cours': return 'blue';
      case 'Partiellement réalisée': return 'yellow';
      case 'Non commencé': return 'gray';
      case 'Abandonnée': return 'red';
      default: return 'gray';
    }
  };

  const getTauxRealisation = () => {
    const total = recommandations.length;
    if (total === 0) return 0;
    const realisees = recommandations.filter(r => r.NiveauMiseEnOeuvre === 'Réalisée').length;
    return (realisees / total) * 100;
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des recommandations",
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `recommandations_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (!filePath) { setExporting(false); return; }

      const data = filteredRecommandations.map(rec => ({
        'ID': rec.RecommandationID,
        'Numéro': rec.NumeroRecommandation || '',
        'Texte': rec.TexteRecommandation,
        'Rapport': rec.NumeroRapport,
        'Responsable': rec.ResponsableMiseEnOeuvre || '',
        'Échéance': rec.Echeance || '',
        'Statut': rec.NiveauMiseEnOeuvre || 'Non commencé',
        'Domaine': rec.Domaine || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 50 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recommandations');
      await writeFile(filePath, new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
      notifications.show({ title: 'Succès', message: 'Export Excel réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des recommandations en PDF",
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `recommandations_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (!filePath) { setExporting(false); return; }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LISTE DES RECOMMANDATIONS', 148.5, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Généré le : ${dayjs().format('DD/MM/YYYY HH:mm')}`, 148.5, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Total recommandations : ${filteredRecommandations.length}`, 14, 50);
      doc.text(`Taux de réalisation : ${getTauxRealisation().toFixed(1)}%`, 14, 57);

      const head = ['N°', 'Numéro', 'Recommandation', 'Rapport', 'Responsable', 'Échéance', 'Statut'];
      const body = filteredRecommandations.map((rec, idx) => [
        (idx + 1).toString(),
        rec.NumeroRecommandation || '',
        rec.TexteRecommandation.substring(0, 80),
        rec.NumeroRapport || '',
        rec.ResponsableMiseEnOeuvre || '',
        rec.Echeance || '',
        rec.NiveauMiseEnOeuvre || 'Non commencé'
      ]);

      autoTable(doc, {
        head: [head],
        body: body as any[],
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [27, 54, 93], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2 }
      });

      await writeFile(filePath, new Uint8Array(doc.output('arraybuffer')));
      notifications.show({ title: 'Succès', message: 'Export PDF réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  const exportToWord = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des recommandations en Word",
        filters: [{ name: 'Word Document', extensions: ['doc'] }],
        defaultPath: `recommandations_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`
      });
      if (!filePath) { setExporting(false); return; }

      const rows = filteredRecommandations.map((rec, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:8px"><strong>${rec.NumeroRecommandation || rec.RecommandationID}</strong></td>
          <td style="border:1px solid #ddd;padding:8px">${rec.TexteRecommandation.substring(0, 100)}...</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.NumeroRapport || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.ResponsableMiseEnOeuvre || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.Echeance || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${rec.NiveauMiseEnOeuvre || 'Non commencé'}</td>
        </tr>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des recommandations</title>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; margin: 40px; }
        h1 { color: #1b365d; border-bottom: 3px solid #1b365d; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1b365d; color: white; padding: 10px; border: 1px solid #ddd; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
      </head>
      <body>
        <h1>📋 LISTE DES RECOMMANDATIONS</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total recommandations : ${filteredRecommandations.length}</p>
        <table><thead><tr><th>N°</th><th>Numéro</th><th>Recommandation</th><th>Rapport</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>
      </body>
      </html>`;

      await writeFile(filePath, new TextEncoder().encode(htmlContent));
      notifications.show({ title: 'Succès', message: 'Export Word réussi !', color: 'green', icon: <IconCheck size={16} /> });
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'export', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = (orientation: 'portrait' | 'landscape') => {
    const rows = filteredRecommandations.map((rec, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${rec.NumeroRecommandation || rec.RecommandationID}</td>
      <td>${rec.TexteRecommandation.substring(0, 80)}...</td>
      <td>${rec.NumeroRapport || '-'}</td>
      <td>${rec.ResponsableMiseEnOeuvre || '-'}</td>
      <td>${rec.Echeance || '-'}</td>
      <td>${rec.NiveauMiseEnOeuvre || 'Non commencé'}</td>
    </tr>
  `).join('');

    const content = `
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr style="background:#1b365d;color:white;">
          <th>N°</th>
          <th>Numéro</th>
          <th>Recommandation</th>
          <th>Rapport</th>
          <th>Responsable</th>
          <th>Échéance</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

    printDocument(content, 'LISTE DES RECOMMANDATIONS', orientation);
  };

  const filteredRecommandations = recommandations.filter(rec => {
    const matchesSearch = rec.TexteRecommandation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.NumeroRecommandation && rec.NumeroRecommandation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatut = !filterStatut || rec.NiveauMiseEnOeuvre === filterStatut;
    return matchesSearch && matchesStatut;
  });

  const totalPages = Math.ceil(filteredRecommandations.length / itemsPerPage);
  const paginatedRecommandations = filteredRecommandations.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const rapportOptions = rapports.map(rapport => ({
    value: rapport.RapportID.toString(),
    label: `${rapport.NumeroRapport} - ${rapport.LibelleRapport}`
  }));

  const statutOptions = [
    { value: 'Réalisée', label: 'Réalisée' },
    { value: 'En cours', label: 'En cours' },
    { value: 'Partiellement réalisée', label: 'Partiellement réalisée' },
    { value: 'Non commencé', label: 'Non commencé' },
    { value: 'Abandonnée', label: 'Abandonnée' }
  ];

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des recommandations...</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          {/* Header */}
          <Card withBorder radius="lg" p="xl" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Group justify="space-between" align="center">
              <Group gap="md">
                <Avatar size={60} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconListCheck size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Gestion des Recommandations</Title>
                  <Text c="gray.3" size="sm">Suivez et gérez les recommandations issues des inspections</Text>
                  <Group gap="xs" mt={8}>
                    <Badge size="sm" variant="white" color="blue">BD-SDI v2.0</Badge>
                    <Badge size="sm" variant="white" color="green">Actions correctives</Badge>
                  </Group>
                </Box>
              </Group>
              <Button variant="light" color="white" leftSection={<IconInfoCircle size={18} />} onClick={() => setInfoModalOpen(true)} radius="md">
                Instructions
              </Button>
            </Group>
          </Card>

          <Transition mounted={true} transition="slide-down" duration={500} timingFunction="ease">
            {(styles) => (
              <div style={styles}>
                <RecommandationsStatCards recommandations={recommandations} />
              </div>
            )}
          </Transition>

          {/* Barre d'actions */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" mb="md">
              <Box>
                <Text fw={600} size="lg">Liste des recommandations</Text>
                <Text size="xs" c="dimmed">{filteredRecommandations.length} recommandation(s) trouvée(s)</Text>
              </Box>
              <Group>
                <Tooltip label="Actualiser">
                  <ActionIcon onClick={loadRecommandations} size="lg" variant="light" color="blue">
                    <IconRefresh size={18} />
                  </ActionIcon>
                </Tooltip>
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <Button leftSection={<IconDownload size={16} />} variant="outline" loading={exporting}>Exporter</Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Format d'export</Menu.Label>
                    <Menu.Item leftSection={<IconFileExcel size={16} color="#00a84f" />} onClick={exportToExcel}>Excel (.xlsx)</Menu.Item>
                    <Menu.Item leftSection={<IconFile size={16} color="#e74c3c" />} onClick={exportToPDF}>PDF (.pdf)</Menu.Item>
                    <Menu.Item leftSection={<IconFileWord size={16} color="#2980b9" />} onClick={exportToWord}>Word (.doc)</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Menu shadow="md" width={160}>
                  <Menu.Target>
                    <Tooltip label="Imprimer">
                      <ActionIcon size="lg" variant="light" color="teal">
                        <IconPrinter size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => handlePrint('portrait')}>🧾 Portrait</Menu.Item>
                    <Menu.Item onClick={() => handlePrint('landscape')}>📄 Paysage</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingId(null); form.reset(); setCurrentDomaineInput(''); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                  Nouvelle Recommandation
                </Button>
              </Group>
            </Group>

            <Divider my="md" />

            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  placeholder="Rechercher par numéro ou texte..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }}
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  placeholder="Filtrer par statut"
                  value={filterStatut}
                  onChange={(val) => { setFilterStatut(val); setActivePage(1); }}
                  clearable
                  data={statutOptions}
                  size="sm"
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Tableau */}
          <Card withBorder radius="lg" shadow="sm" p="0" style={{ overflow: 'hidden' }}>
            <ScrollArea style={{ maxHeight: 500 }}>
              <Table
                striped
                highlightOnHover
                style={{ fontSize: '11px', minWidth: '1200px' }}
              >
                <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: 'white', width: '70px', fontSize: '11px', padding: '8px 4px' }}>N°</Table.Th>
                    <Table.Th style={{ color: 'white', width: '250px', fontSize: '11px', padding: '8px 4px' }}>Recommandation</Table.Th>
                    <Table.Th style={{ color: 'white', width: '350px', fontSize: '11px', padding: '8px 4px' }}>Rapport associé</Table.Th>
                    <Table.Th style={{ color: 'white', width: '180px', fontSize: '11px', padding: '8px 4px' }}>Responsable</Table.Th>
                    <Table.Th style={{ color: 'white', width: '100px', fontSize: '11px', padding: '8px 4px' }}>Échéance</Table.Th>
                    <Table.Th style={{ color: 'white', width: '120px', fontSize: '11px', padding: '8px 4px' }}>Statut</Table.Th>
                    <Table.Th style={{ color: 'white', width: '140px', fontSize: '11px', padding: '8px 4px', textAlign: 'center' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedRecommandations.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Center py="xl">
                          <Stack align="center">
                            <IconListCheck size={48} color="gray" />
                            <Text c="dimmed" size="sm">Aucune recommandation trouvée</Text>
                          </Stack>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedRecommandations.map((rec) => (
                      <Table.Tr key={rec.RecommandationID}>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Badge variant="light" color="blue" size="sm" radius="md">{rec.NumeroRecommandation || rec.RecommandationID}</Badge>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Stack gap={4}>
                            <Text fw={500} size="xs" lineClamp={2}>{rec.TexteRecommandation}</Text>
                            {rec.ProblemeFaiblesse && <Text size="xs" c="dimmed" lineClamp={1}>⚠️ {rec.ProblemeFaiblesse}</Text>}
                          </Stack>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Tooltip
                            label={
                              <Stack gap={4} p="xs">
                                <Text fw={700} size="sm">Détails du rapport :</Text>
                                <Text size="xs">📄 Numéro: {rec.NumeroRapport || 'Non défini'}</Text>
                                {rec.LibelleRapport && <Text size="xs">📝 Libellé: {rec.LibelleRapport}</Text>}
                                <Text size="xs">🔗 ID: {rec.RapportID || '-'}</Text>
                              </Stack>
                            }
                            withArrow
                            position="bottom"
                            w={300}
                            multiline
                          >
                            <Paper p="xs" bg="gray.0" radius="md" withBorder style={{ cursor: 'pointer' }}>
                              <Stack gap={2}>
                                <Group gap={4} wrap="nowrap">
                                  <IconFile size={12} color="#1b365d" />
                                  <Text fw={700} size="xs" c="blue" truncate>{rec.NumeroRapport || 'N° non défini'}</Text>
                                </Group>
                                {rec.LibelleRapport && <Text size="xs" c="dimmed" truncate lineClamp={1}>{rec.LibelleRapport}</Text>}
                              </Stack>
                            </Paper>
                          </Tooltip>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Group gap={6} wrap="nowrap">
                            <IconUser size={14} color="gray" />
                            <Text size="xs" truncate>{rec.ResponsableMiseEnOeuvre || 'Non attribué'}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Stack gap={2} align="center">
                            <Text size="xs" fw={500}>{rec.Echeance || '-'}</Text>
                            {rec.Echeance === 'Court terme' && <Badge color="red" size="xs" variant="filled">Urgent</Badge>}
                            {rec.Echeance === 'Moyen terme' && <Badge color="orange" size="xs" variant="filled">Intermédiaire</Badge>}
                            {rec.Echeance === 'Long terme' && <Badge color="green" size="xs" variant="filled">Planifié</Badge>}
                          </Stack>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Badge color={getNiveauColor(rec.NiveauMiseEnOeuvre)} variant="light" size="xs">
                            {rec.NiveauMiseEnOeuvre || 'Non commencé'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Group justify="center" gap={4} wrap="nowrap">
                            <Tooltip label="Voir détails">
                              <ActionIcon onClick={() => handleView(rec)} color="green" variant="light" size="sm">
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Modifier">
                              <ActionIcon
                                onClick={() => {
                                  setEditingId(rec.RecommandationID);
                                  setCurrentDomaineInput(rec.Domaine || '');
                                  form.setValues({
                                    Services: rec.Services || '',
                                    Source: rec.Source || '',
                                    RapportID: rec.RapportID?.toString() || '',
                                    ProblemeFaiblesse: rec.ProblemeFaiblesse || '',
                                    NumeroRecommandation: rec.NumeroRecommandation || '',
                                    TexteRecommandation: rec.TexteRecommandation || '',
                                    ResponsableMiseEnOeuvre: rec.ResponsableMiseEnOeuvre || '',
                                    ActeursImpliques: rec.ActeursImpliques || '',
                                    InstanceValidation: rec.InstanceValidation || '',
                                    Echeance: rec.Echeance || '',
                                    Domaine: rec.Domaine || '',
                                  });
                                  setModalOpen(true);
                                }}
                                color="orange" variant="light" size="sm"
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Suivi">
                              <ActionIcon onClick={() => openSuiviModal(rec)} color="blue" variant="light" size="sm">
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Supprimer">
                              <ActionIcon
                                onClick={() => { setRecommandationToDelete(rec.RecommandationID); setDeleteModalOpen(true); }}
                                color="red" variant="light" size="sm"
                              >
                                <IconTrash size={16} />
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
          </Card>

          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination total={totalPages} value={activePage} onChange={setActivePage} color="blue" size="sm" />
            </Group>
          )}
        </Stack>
      </Container>

      {/* Modal Formulaire */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); form.reset(); setCurrentDomaineInput(''); }}
        title={<Text fw={600} size="md">{editingId ? "Modifier la Recommandation" : "Nouvelle Recommandation"}</Text>}
        size="xl"
        centered
        scrollAreaComponent={ScrollArea.Autosize}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: 16 } }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Rapport d'inspection"
              placeholder="Sélectionner un rapport"
              data={rapportOptions}
              {...form.getInputProps('RapportID')}
              required searchable size="md"
            />

            <TextInput
              label="Problème / Faiblesse identifié(e)"
              placeholder="Description du problème"
              {...form.getInputProps('ProblemeFaiblesse')}
              size="md"
            />

            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Numéro de recommandation"
                  placeholder="Ex: REC-001"
                  {...form.getInputProps('NumeroRecommandation')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Group align="flex-end" gap="xs">
                  <div style={{ flex: 1 }}>
                    <Autocomplete
                      label="Domaine"
                      placeholder="Sélectionner ou saisir un domaine"
                      data={domaineOptions}
                      {...form.getInputProps('Domaine')}
                      size="md"
                      onChange={(value) => { form.setFieldValue('Domaine', value); setCurrentDomaineInput(value); }}
                    />
                  </div>
                  {currentDomaineInput && currentDomaineInput !== form.values.Domaine && !domaineOptions.includes(currentDomaineInput) && (
                    <Button size="sm" variant="light" color="green" onClick={() => { addNewDomaine(currentDomaineInput); form.setFieldValue('Domaine', currentDomaineInput); setCurrentDomaineInput(''); }}>
                      <IconPlus size={16} /> Ajouter
                    </Button>
                  )}
                </Group>
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Texte de la recommandation"
                  placeholder="Décrire la recommandation..."
                  rows={3}
                  {...form.getInputProps('TexteRecommandation')}
                  required size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Responsable mise en œuvre"
                  placeholder="Nom du responsable"
                  {...form.getInputProps('ResponsableMiseEnOeuvre')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Échéance"
                  placeholder="Sélectionner le délai"
                  data={[
                    { value: 'Court terme', label: 'Court terme (≤ 3 mois)' },
                    { value: 'Moyen terme', label: 'Moyen terme (3-6 mois)' },
                    { value: 'Long terme', label: 'Long terme (> 6 mois)' }
                  ]}
                  {...form.getInputProps('Echeance')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Acteurs impliqués"
                  placeholder="Liste des acteurs"
                  {...form.getInputProps('ActeursImpliques')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Instance de validation"
                  {...form.getInputProps('InstanceValidation')}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Services concernés"
                  {...form.getInputProps('Services')}
                  size="md"
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => { setModalOpen(false); form.reset(); setCurrentDomaineInput(''); }}>Annuler</Button>
              <Button type="submit">{editingId ? 'Modifier' : 'Créer'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Suivi */}
      <Modal
        opened={suiviModalOpen}
        onClose={() => { setSuiviModalOpen(false); setSelectedRecommandation(null); }}
        title={<Text fw={600} size="md">Suivi de la recommandation</Text>}
        size="xl"
        centered
        scrollAreaComponent={ScrollArea.Autosize}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: 16 } }}
      >
        {selectedRecommandation && (
          <form onSubmit={suiviForm.onSubmit(handleUpdateSuivi)}>
            <Stack gap="md">
              <Card withBorder bg="blue.0" p="md">
                <Text fw={600} size="sm" mb="xs">📌 {selectedRecommandation.NumeroRecommandation || `Recommandation ${selectedRecommandation.RecommandationID}`}</Text>
                <Text size="sm">{selectedRecommandation.TexteRecommandation}</Text>
                <Divider my="sm" />
                <Group gap="md">
                  <Text size="xs" c="dimmed">Rapport: <strong>{selectedRecommandation.NumeroRapport}</strong></Text>
                  <Text size="xs" c="dimmed">Responsable: <strong>{selectedRecommandation.ResponsableMiseEnOeuvre || 'Non défini'}</strong></Text>
                  <Text size="xs" c="dimmed">Échéance: <strong>{selectedRecommandation.Echeance || 'Non définie'}</strong></Text>
                </Group>
              </Card>

              <Select
                label="Niveau de mise en œuvre"
                data={['Non commencé', 'En cours', 'Partiellement réalisée', 'Réalisée', 'Abandonnée']}
                {...suiviForm.getInputProps('NiveauMiseEnOeuvre')}
                size="md"
              />

              <Grid>
                <Grid.Col span={6}>
                  <DateInput label="Date de début" placeholder="Début des actions" {...suiviForm.getInputProps('DateDebut')} size="md" />
                </Grid.Col>
                <Grid.Col span={6}>
                  <DateInput label="Date de fin" placeholder="Fin prévue" {...suiviForm.getInputProps('DateFin')} size="md" />
                </Grid.Col>
              </Grid>

              <Textarea label="Mesures correctives prises" placeholder="Décrire les actions entreprises..." rows={3} {...suiviForm.getInputProps('MesuresCorrectives')} size="md" />
              <Textarea label="Observation sur les délais" placeholder="Respect des délais, retards, etc." rows={2} {...suiviForm.getInputProps('ObservationDelai')} size="md" />
              <Textarea label="Observation sur la mise en œuvre" placeholder="Difficultés rencontrées, succès, etc." rows={2} {...suiviForm.getInputProps('ObservationMiseEnOeuvre')} size="md" />
              <Select label="Appréciation du contrôle" data={['Excellent', 'Bon', 'Satisfaisant', 'Insuffisant', 'Critique']} {...suiviForm.getInputProps('AppreciationControle')} size="md" />

              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => setSuiviModalOpen(false)}>Annuler</Button>
                <Button type="submit">Enregistrer le suivi</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      {/* Modal Visualisation */}
      <Modal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={<Text fw={600} size="md">Détails de la Recommandation</Text>}
        size="xl"
        centered
        scrollAreaComponent={ScrollArea.Autosize}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: 16 } }}
      >
        {selectedRecommandation && (
          <Stack gap="md">
            <Card withBorder radius="md" p="sm" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)', color: 'white' }}>
              <Group justify="space-between">
                <Badge color="blue" size="lg" variant="white">{selectedRecommandation.NumeroRecommandation || `REC-${selectedRecommandation.RecommandationID}`}</Badge>
                <Badge color={getNiveauColor(selectedRecommandation.NiveauMiseEnOeuvre)} variant="filled" size="lg">
                  {selectedRecommandation.NiveauMiseEnOeuvre || 'Non commencé'}
                </Badge>
              </Group>
            </Card>

            <Divider />

            <Grid>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Recommandation</Text>
                <Text fw={500} size="sm">{selectedRecommandation.TexteRecommandation}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Paper p="sm" bg="blue.0" radius="md">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Rapport associé</Text>
                  <Text fw={500} size="sm">{selectedRecommandation.NumeroRapport} - {selectedRecommandation.LibelleRapport}</Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Domaine</Text>
                <Badge color="blue" variant="light">{selectedRecommandation.Domaine || '-'}</Badge>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Échéance</Text>
                <Text fw={500} size="sm">{selectedRecommandation.Echeance || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Responsable</Text>
                <Text fw={500} size="sm">{selectedRecommandation.ResponsableMiseEnOeuvre || '-'}</Text>
              </Grid.Col>
              {selectedRecommandation.ProblemeFaiblesse && (
                <Grid.Col span={12}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Problème identifié</Text>
                  <Text size="sm">{selectedRecommandation.ProblemeFaiblesse}</Text>
                </Grid.Col>
              )}
              {selectedRecommandation.ActeursImpliques && (
                <Grid.Col span={12}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Acteurs impliqués</Text>
                  <Text size="sm">{selectedRecommandation.ActeursImpliques}</Text>
                </Grid.Col>
              )}
            </Grid>

            <Divider />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setViewModalOpen(false)}>Fermer</Button>
              <Button
                variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}
                leftSection={<IconEdit size={16} />}
                onClick={() => {
                  setViewModalOpen(false);
                  setEditingId(selectedRecommandation.RecommandationID);
                  setCurrentDomaineInput(selectedRecommandation.Domaine || '');
                  form.setValues({
                    Services: selectedRecommandation.Services || '',
                    Source: selectedRecommandation.Source || '',
                    RapportID: selectedRecommandation.RapportID?.toString() || '',
                    ProblemeFaiblesse: selectedRecommandation.ProblemeFaiblesse || '',
                    NumeroRecommandation: selectedRecommandation.NumeroRecommandation || '',
                    TexteRecommandation: selectedRecommandation.TexteRecommandation || '',
                    ResponsableMiseEnOeuvre: selectedRecommandation.ResponsableMiseEnOeuvre || '',
                    ActeursImpliques: selectedRecommandation.ActeursImpliques || '',
                    InstanceValidation: selectedRecommandation.InstanceValidation || '',
                    Echeance: selectedRecommandation.Echeance || '',
                    Domaine: selectedRecommandation.Domaine || '',
                  });
                  setModalOpen(true);
                }}
              >
                Modifier
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setRecommandationToDelete(null); }}
        title={<Text fw={600} size="md">Confirmation de suppression</Text>}
        size="sm"
        centered
      >
        <Stack gap="md">
          <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
            Êtes-vous sûr de vouloir supprimer cette recommandation ?
          </Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setRecommandationToDelete(null); }}>Annuler</Button>
            <Button color="red" onClick={handleDelete} leftSection={<IconTrash size={16} />}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Instructions */}
      <Modal
        opened={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={<Text fw={600} size="md">Instructions</Text>}
        size="md"
        centered
      >
        <Stack gap="md">
          <Paper p="md" radius="md" withBorder bg="blue.0">
            <Text fw={600} size="sm" mb="md">📌 Fonctionnalités :</Text>
            <Stack gap="xs">
              <Text size="sm">1️⃣ Renseignez le texte et le numéro de la recommandation</Text>
              <Text size="sm">2️⃣ Liez la recommandation à un rapport d'inspection</Text>
              <Text size="sm">3️⃣ Définissez un responsable et une date d'échéance</Text>
              <Text size="sm">4️⃣ Pour ajouter un nouveau domaine, saisissez-le et cliquez sur "Ajouter"</Text>
              <Text size="sm">5️⃣ Suivez l'avancement via l'onglet Suivi</Text>
              <Text size="sm">6️⃣ Exportez la liste au format Excel, PDF ou Word</Text>
            </Stack>
          </Paper>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - BD-SDI</Text>
        </Stack>
      </Modal>
    </Box>
  );
}