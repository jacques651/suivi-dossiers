// src/pages/Rapports.tsx
import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Title, Card,
  Group, ActionIcon, Select, Textarea, Grid, Badge,
  Avatar, Text, Divider, Loader, Pagination, Tooltip,
  Box, Container, Paper, ThemeIcon,
  ScrollArea, Center, Alert, Menu, Transition
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import {
  IconEdit, IconTrash, IconPlus, IconSearch,
  IconFileText, IconCalendar, IconCategory,
  IconRefresh, IconDownload, IconPrinter,
  IconFileExcel, IconFile, IconFileWord,
  IconInfoCircle, IconCheck, IconX,
  IconReportAnalytics, IconTrendingUp
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
import RapportStatsCards from './rapports/RapportStatsCards';

interface Rapport {
  RapportID: number;
  LibelleRapport: string;
  NumeroRapport: string;
  DateRapport: string;
  TypeInspection?: string;
  PeriodeSousRevue?: string;
  Fichier?: string;
}

export default function Rapports() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRapport, setSelectedRapport] = useState<Rapport | null>(null);
  const [rapportToDelete, setRapportToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const itemsPerPage = 10;
  const { printDocument } = usePrint();

  const form = useForm({
    initialValues: {
      LibelleRapport: '',
      NumeroRapport: '',
      DateRapport: new Date(),
      TypeInspection: '',
      PeriodeSousRevue: '',
      Fichier: '',
    },
    validate: {
      LibelleRapport: (value) => (value ? null : 'Le libellé est requis'),
      NumeroRapport: (value) => (value ? null : 'Le numéro est requis'),
      DateRapport: (value) => (value ? null : 'La date est requise'),
    },
  });

  useEffect(() => {
    loadRapports();
  }, []);

  const loadRapports = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_rapports');
      setRapports(result as Rapport[]);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les rapports',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const rapportData = {
        ...values,
        RapportID: editingId,
        DateRapport: dayjs(values.DateRapport).format('YYYY-MM-DD'),
      };

      if (editingId) {
        await invoke('update_rapport', { rapport: rapportData });
        notifications.show({ 
          title: 'Succès', 
          message: 'Rapport modifié avec succès', 
          color: 'green', 
          icon: <IconCheck size={16} /> 
        });
      } else {
        await invoke('create_rapport', { rapport: rapportData });
        notifications.show({ 
          title: 'Succès', 
          message: 'Rapport créé avec succès', 
          color: 'green', 
          icon: <IconCheck size={16} /> 
        });
      }

      setModalOpen(false);
      form.reset();
      setEditingId(null);
      loadRapports();
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: `Erreur: ${error}`, 
        color: 'red', 
        icon: <IconX size={16} /> 
      });
    }
  };

  const handleDelete = async () => {
    if (!rapportToDelete) return;
    try {
      await invoke('delete_rapport', { id: rapportToDelete });
      notifications.show({ 
        title: 'Succès', 
        message: 'Rapport supprimé avec succès', 
        color: 'green', 
        icon: <IconCheck size={16} /> 
      });
      setDeleteModalOpen(false);
      setRapportToDelete(null);
      loadRapports();
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Impossible de supprimer le rapport', 
        color: 'red', 
        icon: <IconX size={16} /> 
      });
    }
  };

  const handleView = (rapport: Rapport) => {
    setSelectedRapport(rapport);
    setViewModalOpen(true);
  };

  const getTypeColor = (type?: string): string => {
    switch (type) {
      case 'Contrôle/Audit': return 'green';
      case 'Investigation': return 'orange';
      default: return 'gray';
    }
  };

  // Export EXCEL
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des rapports",
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        defaultPath: `rapports_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`
      });
      if (!filePath) { setExporting(false); return; }

      const data = filteredRapports.map(rapport => ({
        'ID': rapport.RapportID,
        'Numéro': rapport.NumeroRapport,
        'Libellé': rapport.LibelleRapport,
        'Date': dayjs(rapport.DateRapport).format('DD/MM/YYYY'),
        "Type d'inspection": rapport.TypeInspection || '',
        'Période sous revue': rapport.PeriodeSousRevue || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 20 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapports');
      const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      await writeFile(filePath, new Uint8Array(excelBuffer));
      notifications.show({ 
        title: 'Succès', 
        message: 'Export Excel réussi !', 
        color: 'green', 
        icon: <IconCheck size={16} /> 
      });
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Erreur lors de l\'export Excel', 
        color: 'red', 
        icon: <IconX size={16} /> 
      });
    } finally {
      setExporting(false);
    }
  };

  // Export PDF
  const exportToPDF = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des rapports en PDF",
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `rapports_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`
      });
      if (!filePath) { setExporting(false); return; }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 297, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LISTE DES RAPPORTS D\'INSPECTION', 148.5, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Généré le : ${dayjs().format('DD/MM/YYYY HH:mm')}`, 148.5, 32, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Total rapports : ${filteredRapports.length}`, 14, 50);

      const head = ['N°', 'N° Rapport', 'Libellé', 'Date', "Type d'inspection", 'Période sous revue'];
      const body = filteredRapports.map((rapport, idx) => [
        idx + 1, rapport.NumeroRapport, rapport.LibelleRapport,
        dayjs(rapport.DateRapport).format('DD/MM/YYYY'), rapport.TypeInspection || '', rapport.PeriodeSousRevue || ''
      ]);

      autoTable(doc, {
        head: [head], body: body, startY: 60, theme: 'striped',
        headStyles: { fillColor: [27, 54, 93], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 3 }
      });

      await writeFile(filePath, new Uint8Array(doc.output('arraybuffer')));
      notifications.show({ 
        title: 'Succès', 
        message: 'Export PDF réussi !', 
        color: 'green', 
        icon: <IconCheck size={16} /> 
      });
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Erreur lors de l\'export PDF', 
        color: 'red', 
        icon: <IconX size={16} /> 
      });
    } finally {
      setExporting(false);
    }
  };

  // Export Word
  const exportToWord = async () => {
    try {
      setExporting(true);
      const filePath = await save({
        title: "Exporter la liste des rapports en Word",
        filters: [{ name: 'Word Document', extensions: ['doc'] }],
        defaultPath: `rapports_${dayjs().format('YYYY-MM-DD_HH-mm')}.doc`
      });
      if (!filePath) { setExporting(false); return; }

      const rows = filteredRapports.map((rapport, idx) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center">${idx + 1}</td>
          <td style="border:1px solid #ddd;padding:8px">${rapport.NumeroRapport}</td>
          <td style="border:1px solid #ddd;padding:8px"><strong>${rapport.LibelleRapport}</strong></td>
          <td style="border:1px solid #ddd;padding:8px">${dayjs(rapport.DateRapport).format('DD/MM/YYYY')}</td>
          <td style="border:1px solid #ddd;padding:8px">${rapport.TypeInspection || '-'}</td>
          <td style="border:1px solid #ddd;padding:8px">${rapport.PeriodeSousRevue || '-'}</td>
        </tr>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Liste des rapports</title>
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
        <h1>📋 LISTE DES RAPPORTS D'INSPECTION</h1>
        <p>Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Total rapports : ${filteredRapports.length}</p>
        <table><thead><tr><th>N°</th><th>Numéro</th><th>Libellé</th><th>Date</th><th>Type</th><th>Période</th></tr></thead><tbody>${rows}</tbody><table>
      </body>
      </html>`;

      await writeFile(filePath, new TextEncoder().encode(htmlContent));
      notifications.show({ 
        title: 'Succès', 
        message: 'Export Word réussi !', 
        color: 'green', 
        icon: <IconCheck size={16} /> 
      });
    } catch (error) {
      notifications.show({ 
        title: 'Erreur', 
        message: 'Erreur lors de l\'export Word', 
        color: 'red', 
        icon: <IconX size={16} /> 
      });
    } finally {
      setExporting(false);
    }
  };

  // Impression
  const handlePrint = (orientation: 'portrait' | 'landscape') => {
    const rows = filteredRapports.map((rapport, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${rapport.NumeroRapport}</td>
        <td>${rapport.LibelleRapport}</td>
        <td>${dayjs(rapport.DateRapport).format('DD/MM/YYYY')}</td>
        <td>${rapport.TypeInspection || '-'}</td>
        <td>${rapport.PeriodeSousRevue || '-'}</td>
      </tr>
    `).join('');

    const content = `
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #1b365d; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd;">N°</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Numéro</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Libellé</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Date</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Type</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Période</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    printDocument(content, 'LISTE DES RAPPORTS D\'INSPECTION', orientation);
  };

  // Filtrage des rapports
  const filteredRapports = rapports.filter(rapport =>
    rapport.NumeroRapport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rapport.LibelleRapport?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRapports.length / itemsPerPage);
  const paginatedRapports = filteredRapports.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  // Statistiques pour les cartes
  const totalRapports = rapports.length;
  const typeCount = [...new Set(rapports.map(r => r.TypeInspection).filter(Boolean))].length;

  const typeOptions = ['Contrôle/Audit', 'Investigation'];

  const rapportsStatsData = rapports.map((rapport) => ({
    DateRapport: rapport.DateRapport,
    TypeInspection: rapport.TypeInspection || '',
  }));

  if (loading) {
    return (
      <Center style={{ height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Paper p="xl" radius="xl" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
          <Stack align="center" gap="md">
            <Loader size="xl" variant="dots" color="#667eea" />
            <Text size="lg" fw={500} variant="gradient" gradient={{ from: '#667eea', to: '#764ba2' }}>
              Chargement des rapports...
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
          {/* En-tête - exactement comme AgentManager */}
          <Transition mounted={true} transition="fade" duration={600}>
            {(styles) => (
              <Card 
                withBorder 
                radius="xl" 
                p="xl" 
                style={{ 
                  ...styles,
                  background: 'linear-gradient(135deg, #1b365d 0%, #295080 100%)',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
                }}
              >
                <Group justify="space-between" align="center">
                  <Group gap="lg">
                    <Avatar 
                      size={60} 
                      radius="xl" 
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))'
                      }}
                    >
                      <IconReportAnalytics size={28} color="white" />
                    </Avatar>
                    <Box>
                      <Title order={1} c="white" fw={800} size="h2">
                        Gestion des Rapports d'Inspection
                      </Title>
                      <Group gap="xs" mt={5}>
                        <Badge size="lg" variant="light" color="white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                          <Group gap="xs">
                            <IconFileText size={14} />
                            <Text size="sm">{totalRapports} rapports</Text>
                          </Group>
                        </Badge>
                        <Badge size="lg" variant="light" color="white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                          <Group gap="xs">
                            <IconCategory size={14} />
                            <Text size="sm">{typeCount} types</Text>
                          </Group>
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  
                  <Group gap="md">
                    <Button 
                      variant="light" 
                      color="white" 
                      leftSection={<IconRefresh size={18} />}
                      onClick={loadRapports}
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
                    
                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <Button 
                          variant="light" 
                          color="white" 
                          leftSection={<IconDownload size={18} />}
                          loading={exporting}
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Exporter
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Format d'export</Menu.Label>
                        <Menu.Item leftSection={<IconFileExcel size={16} color="#00a84f" />} onClick={exportToExcel}>
                          Excel (.xlsx)
                        </Menu.Item>
                        <Menu.Item leftSection={<IconFile size={16} color="#e74c3c" />} onClick={exportToPDF}>
                          PDF (.pdf)
                        </Menu.Item>
                        <Menu.Item leftSection={<IconFileWord size={16} color="#2980b9" />} onClick={exportToWord}>
                          Word (.doc)
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>

                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <Button 
                          variant="light" 
                          color="white" 
                          leftSection={<IconPrinter size={18} />}
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Imprimer
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => handlePrint('portrait')}>Portrait</Menu.Item>
                        <Menu.Item onClick={() => handlePrint('landscape')}>Paysage</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                    
                    <Button 
                      variant="white" 
                      color="dark" 
                      leftSection={<IconPlus size={18} />}
                      onClick={() => { setEditingId(null); form.reset(); setModalOpen(true); }}
                      style={{ 
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                    >
                      Nouveau Rapport
                    </Button>
                  </Group>
                </Group>
              </Card>
            )}
          </Transition>

    {/* Statistiques avec design amélioré - exactement comme AgentStatsCards */}
<Transition mounted={true} transition="slide-down" duration={500} timingFunction="ease">
  {(styles) => (
    <div style={styles}>
      <RapportStatsCards rapports={rapportsStatsData} />
    </div>
  )}
</Transition>

          {/* Filtres - style amélioré */}
          <Transition mounted={true} transition="slide-down" duration={550} timingFunction="ease">
            {(styles) => (
              <Card withBorder radius="lg" shadow="sm" p="md" style={styles}>
                <Text fw={600} size="lg" mb="md">
                  Filtres
                </Text>
                
                <Group grow align="flex-end">
                  <TextInput
                    label="Recherche"
                    placeholder="Rechercher par numéro ou libellé..."
                    leftSection={<IconSearch size={16} />}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }}
                    size="md"
                    radius="md"
                  />
                  
                  <Select
                    label="Type d'inspection"
                    placeholder="Tous les types"
                    leftSection={<IconCategory size={16} />}
                    data={typeOptions}
                    value={null}
                    onChange={() => {}}
                    clearable
                    size="md"
                    radius="md"
                  />
                </Group>
              </Card>
            )}
          </Transition>

          {/* Résumé des filtres */}
          {searchTerm && (
            <Transition mounted={true} transition="fade" duration={400}>
              {(styles) => (
                <Card withBorder radius="md" p="sm" style={styles}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light" color="blue">
                        <IconTrendingUp size={12} />
                      </ThemeIcon>
                      <Text size="sm" fw={500}>
                        {filteredRapports.length} rapport{filteredRapports.length !== 1 ? 's' : ''} trouvé{filteredRapports.length !== 1 ? 's' : ''}
                      </Text>
                    </Group>
                    <Button 
                      variant="subtle" 
                      size="xs" 
                      onClick={() => setSearchTerm('')}
                    >
                      Effacer la recherche
                    </Button>
                  </Group>
                </Card>
              )}
            </Transition>
          )}

          {/* Tableau - exactement comme AgentTable */}
          <Transition mounted={true} transition="fade" duration={600} timingFunction="ease">
            {(styles) => (
              <Card withBorder radius="lg" shadow="sm" p="0" style={styles}>
                <ScrollArea style={{ maxHeight: 500 }}>
                  <Table striped highlightOnHover>
                    <Table.Thead style={{ background: 'linear-gradient(135deg, #1b365d 0%, #295080 100%)' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: 'white', width: 150 }}>N° Rapport</Table.Th>
                        <Table.Th style={{ color: 'white' }}>Libellé</Table.Th>
                        <Table.Th style={{ color: 'white', width: 120 }}>Date</Table.Th>
                        <Table.Th style={{ color: 'white', width: 150 }}>Type d'inspection</Table.Th>
                        <Table.Th style={{ color: 'white', width: 120, textAlign: 'center' }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {paginatedRapports.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={5}>
                            <Center py="xl">
                              <Stack align="center" gap="xs">
                                <IconFileText size={48} color="gray" />
                                <Text c="dimmed" size="lg">Aucun rapport trouvé</Text>
                                <Button 
                                  variant="light" 
                                  size="sm" 
                                  onClick={() => { setEditingId(null); form.reset(); setModalOpen(true); }}
                                >
                                  Créer un rapport
                                </Button>
                              </Stack>
                            </Center>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        paginatedRapports.map((rapport) => (
                          <Table.Tr key={rapport.RapportID}>
                            <Table.Td>
                              <Badge variant="gradient" gradient={{ from: '#1b365d', to: '#295080' }} size="lg">
                                {rapport.NumeroRapport}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={600} size="md">{rapport.LibelleRapport}</Text>
                              {rapport.PeriodeSousRevue && (
                                <Text size="xs" c="dimmed" mt={2}>
                                  Période: {rapport.PeriodeSousRevue}
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <IconCalendar size={14} color="#868e96" />
                                <Text size="sm">{dayjs(rapport.DateRapport).format('DD/MM/YYYY')}</Text>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              {rapport.TypeInspection ? (
                                <Badge 
                                  color={getTypeColor(rapport.TypeInspection)} 
                                  variant="light" 
                                  size="md"
                                >
                                  {rapport.TypeInspection}
                                </Badge>
                              ) : (
                                <Text c="dimmed" size="sm">-</Text>
                              )}
                            </Table.Td>
                            <Table.Td ta="center">
                              <Group gap="xs" justify="center" wrap="nowrap">
                                <Tooltip label="Voir détails" withArrow>
                                  <ActionIcon 
                                    onClick={() => handleView(rapport)} 
                                    color="green" 
                                    variant="light" 
                                    size="md"
                                    style={{ transition: 'all 0.3s ease' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                  >
                                    <IconFileText size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Modifier" withArrow>
                                  <ActionIcon 
                                    onClick={() => {
                                      setEditingId(rapport.RapportID);
                                      form.setValues({
                                        LibelleRapport: rapport.LibelleRapport,
                                        NumeroRapport: rapport.NumeroRapport,
                                        DateRapport: new Date(rapport.DateRapport),
                                        TypeInspection: rapport.TypeInspection || '',
                                        PeriodeSousRevue: rapport.PeriodeSousRevue || '',
                                        Fichier: rapport.Fichier || '',
                                      });
                                      setModalOpen(true);
                                    }} 
                                    color="blue" 
                                    variant="light" 
                                    size="md"
                                    style={{ transition: 'all 0.3s ease' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                  >
                                    <IconEdit size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Supprimer" withArrow>
                                  <ActionIcon 
                                    onClick={() => { setRapportToDelete(rapport.RapportID); setDeleteModalOpen(true); }} 
                                    color="red" 
                                    variant="light" 
                                    size="md"
                                    style={{ transition: 'all 0.3s ease' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                  >
                                    <IconTrash size={18} />
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
            )}
          </Transition>

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination 
                total={totalPages} 
                value={activePage} 
                onChange={setActivePage} 
                color="#1b365d" 
                size="md"
                radius="md"
              />
            </Group>
          )}
        </Stack>
      </Container>

      {/* Modal Formulaire */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); form.reset(); setEditingId(null); }}
        title={
          <Group gap="sm">
            {editingId ? <IconEdit size={20} color="white" /> : <IconPlus size={20} color="white" />}
            <Text fw={700} size="lg" c="white">{editingId ? "Modifier le Rapport" : "Nouveau Rapport"}</Text>
          </Group>
        }
        size="lg"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
        styles={{
          header: { background: 'linear-gradient(135deg, #1b365d 0%, #295080 100%)', padding: '1.5rem' },
          close: { color: 'white', '&:hover': { background: 'rgba(255,255,255,0.2)', transform: 'rotate(90deg)' } }
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Libellé du rapport"
              placeholder="Ex: Rapport d'inspection annuelle"
              {...form.getInputProps('LibelleRapport')}
              required
              size="md"
              radius="md"
            />
            <TextInput
              label="Numéro du rapport"
              placeholder="Ex: 2025-001/ITS"
              {...form.getInputProps('NumeroRapport')}
              required
              size="md"
              radius="md"
            />
            <DateInput
              label="Date du rapport"
              placeholder="Sélectionner une date"
              {...form.getInputProps('DateRapport')}
              required
              size="md"
              radius="md"
            />
            <Select
              label="Type d'inspection"
              placeholder="Sélectionner un type"
              data={typeOptions}
              {...form.getInputProps('TypeInspection')}
              size="md"
              radius="md"
            />
            <Textarea
              label="Période sous revue"
              placeholder="Description de la période auditée (ex: 1er trimestre 2025)"
              {...form.getInputProps('PeriodeSousRevue')}
              rows={3}
              size="md"
              radius="md"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpen(false)} radius="md">Annuler</Button>
              <Button type="submit" variant="gradient" gradient={{ from: '#1b365d', to: '#295080' }} radius="md">
                {editingId ? 'Modifier' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Visualisation */}
      <Modal
        opened={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={
          <Group gap="sm">
            <IconFileText size={20} color="white" />
            <Text fw={700} size="lg" c="white">Détails du Rapport</Text>
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
        {selectedRapport && (
          <Stack gap="md">
            <Card withBorder bg="gray.0" p="md" radius="lg">
              <Group justify="apart">
                <Badge variant="gradient" gradient={{ from: '#1b365d', to: '#295080' }} size="lg">
                  {selectedRapport.NumeroRapport}
                </Badge>
                {selectedRapport.TypeInspection && (
                  <Badge color={getTypeColor(selectedRapport.TypeInspection)} variant="light" size="md">
                    {selectedRapport.TypeInspection}
                  </Badge>
                )}
              </Group>
            </Card>

            <Divider />

            <Grid>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Libellé</Text>
                <Text fw={600} size="md">{selectedRapport.LibelleRapport}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Date du rapport</Text>
                <Group gap="xs" mt={4}>
                  <IconCalendar size={14} color="#868e96" />
                  <Text fw={500}>{dayjs(selectedRapport.DateRapport).format('DD/MM/YYYY')}</Text>
                </Group>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Type d'inspection</Text>
                <Text fw={500}>{selectedRapport.TypeInspection || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Période sous revue</Text>
                <Text fw={500}>{selectedRapport.PeriodeSousRevue || '-'}</Text>
              </Grid.Col>
            </Grid>
          </Stack>
        )}
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setRapportToDelete(null); }}
        title={
          <Group gap="sm">
            <IconTrash size={20} color="red" />
            <Text fw={700} size="lg">Confirmation de suppression</Text>
          </Group>
        }
        size="sm"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.55 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <Stack gap="md">
          <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />} radius="md">
            Êtes-vous sûr de vouloir supprimer ce rapport ?
          </Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setRapportToDelete(null); }} radius="md">
              Annuler
            </Button>
            <Button color="red" onClick={handleDelete} leftSection={<IconTrash size={16} />} radius="md">
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Instructions */}
      <Modal
        opened={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={
          <Group gap="sm">
            <IconInfoCircle size={20} color="white" />
            <Text fw={700} size="lg" c="white">Instructions d'utilisation</Text>
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
          <Paper p="md" radius="lg" withBorder style={{ background: 'linear-gradient(135deg, #e8f4fd 0%, #d4e8f7 100%)' }}>
            <Text fw={700} size="sm" mb="md" style={{ color: '#1b365d' }}>
              📋 Fonctionnalités principales :
            </Text>
            <Stack gap="sm">
              <Group gap="sm">
                <ThemeIcon size="xs" radius="xl" color="blue" variant="light">1</ThemeIcon>
                <Text size="sm">Créez un nouveau rapport avec le bouton <strong>"Nouveau Rapport"</strong></Text>
              </Group>
              <Group gap="sm">
                <ThemeIcon size="xs" radius="xl" color="blue" variant="light">2</ThemeIcon>
                <Text size="sm">Renseignez le libellé, le numéro, la date et le type d'inspection</Text>
              </Group>
              <Group gap="sm">
                <ThemeIcon size="xs" radius="xl" color="blue" variant="light">3</ThemeIcon>
                <Text size="sm">Décrivez la période sous revue pour plus de précision</Text>
              </Group>
              <Group gap="sm">
                <ThemeIcon size="xs" radius="xl" color="blue" variant="light">4</ThemeIcon>
                <Text size="sm">Exportez la liste au format Excel, PDF ou Word</Text>
              </Group>
              <Group gap="sm">
                <ThemeIcon size="xs" radius="xl" color="blue" variant="light">5</ThemeIcon>
                <Text size="sm">Utilisez la recherche pour filtrer rapidement les rapports</Text>
              </Group>
              <Group gap="sm">
                <ThemeIcon size="xs" radius="xl" color="blue" variant="light">6</ThemeIcon>
                <Text size="sm">Imprimez la liste en format portrait ou paysage</Text>
              </Group>
            </Stack>
          </Paper>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - Service des Inspections Techniques</Text>
        </Stack>
      </Modal>
    </Box>
  );
}