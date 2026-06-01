import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Card,
  Group, ActionIcon, Select, Textarea, Badge, Grid,
  Avatar, Text, Divider, Loader, Pagination, Tooltip,
  Box, Container, Paper,
  ScrollArea, Center, Alert, Menu,
  Transition,
  FileInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconEdit, IconTrash, IconPlus, IconEye, IconSearch,
  IconGavel,
  IconRefresh, IconDownload, IconPrinter,
  IconFileExcel, IconFile, IconFileWord, IconInfoCircle,
  IconCheck, IconX
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { usePrint } from '../hooks/usePrint';
import DossierStatsCards from './DossierStatsCards';
import PageHeader from '../components/PageHeader';

export interface Dossier {
  Grade: string;
  DossierID: number;
  PersonnelID: number;
  TypeInconduite?: string;
  PeriodeInconduite?: string;
  Annee?: number;
  ServiceInvestigation?: number;
  Etat?: string;
  SuiteReservee?: string;
  TypeSanction?: string;
  Sanction?: string;
  ActeSanction?: string;
  NumeroActeSanction?: string;
  AutoriteSanction?: string;
  Observations?: string;
  IDRapport?: number;
  AgentNom?: string;
  AgentPrenom?: string;
  AgentMatricule?: string;
}

interface Agent {
  PersonnelID: number;
  Nom: string;
  Prenom: string;
  Matricule: string;
  Service?: string;
  Entite?: string;
}

interface ServiceInvestigation {
  ServiceID: number;
  LibelleService: string;
  Acronyme?: string;
}

export default function Dossiers() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [services, setServices] = useState<ServiceInvestigation[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [dossierToDelete, setDossierToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtat, setFilterEtat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [customObject, setCustomObject] = useState('');
  const itemsPerPage = 10;

  const [currentEtat, setCurrentEtat] = useState('En cours');
  const isEtatEnCours = currentEtat === 'En cours';
  const [acteSanctionFile, setActeSanctionFile] = useState<File | null>(null);

  // Options statiques pour les sanctions
  const typeSanctionOptions = ['Sanction administrative', 'Sanction judiciaire', 'Sanction disciplinaire', 'Aucune'];
  const sanctionOptions = [
    'Avertissement', 'Blâme', 'Suspension', 'Rétrogradation',
    'Révocation', 'Licenciement', 'Mutation', 'Mise à pied'
  ];

  const [typeInconduiteOptions, setTypeInconduiteOptions] = useState<string[]>([
    'Faute professionnelle',
    'Abus de pouvoir',
    'Corruption',
    'Négligence',
    'Absence injustifiée',
    'Insoumission',
    'Violation des consignes'
  ]);

  const { printDocument } = usePrint();
  const suiteReserveeOptions = ['Sanctionné(e)', 'Acquitté(e)', 'Classé sans suite', 'En instance'];
  const etatOptions = ['En cours', 'Suspendu', 'Clôturé', 'Abandonné'];

  // Fonction utilitaire pour sauvegarder le fichier
  const saveActeSanctionFile = async (file: File): Promise<string> => {
    try {
      const appDataDir = await invoke('get_app_data_dir') as string;
      const fileName = `acte_sanction_${Date.now()}_${file.name}`;
      const filePath = `${appDataDir}\\${fileName}`;

      const fileToBytes = (file: File): Promise<number[]> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = () => {
            const bytes = new Uint8Array(reader.result as ArrayBuffer);
            resolve(Array.from(bytes));
          };
          reader.onerror = (error) => reject(error);
        });
      };

      const fileBytes = await fileToBytes(file);
      await invoke('save_rapport_file', {
        filePath: filePath,
        fileContent: fileBytes
      });

      return filePath;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error;
    }
  };

  const form = useForm({
    initialValues: {
      PersonnelID: '',
      TypeInconduite: '',
      PeriodeInconduite: '',
      Annee: new Date().getFullYear(),
      ServiceInvestigation: '',
      Etat: 'En cours',
      SuiteReservee: '',
      TypeSanction: '',
      Sanction: '',
      ActeSanction: '',
      NumeroActeSanction: '',
      AutoriteSanction: '',
      Observations: '',
      IDRapport: '',
    },
    validate: {
      PersonnelID: (value) => (value ? null : "L'agent est requis"),
    },
  });

  const [rapports, setRapports] = useState<any[]>([]);

  const loadRapports = async () => {
    try {
      const result = await invoke('get_rapports_list');
      setRapports(result as any[]);
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    }
  };

  useEffect(() => {
    loadDossiers();
    loadAgents();
    loadServices();
    loadTypeInconduiteOptions();
    loadRapports();
  }, []);

  useEffect(() => {
    setCurrentEtat(form.values.Etat || 'En cours');
  }, [form.values.Etat]);

  const loadDossiers = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_dossiers');
      setDossiers(result as Dossier[]);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les dossiers', color: 'red', icon: <IconX size={16} /> });
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const result = await invoke('get_agents');
      setAgents(result as Agent[]);
    } catch (error) {
      console.error('Erreur chargement agents:', error);
    }
  };

  const loadServices = async () => {
    try {
      const result = await invoke('get_services_investigation');
      setServices(result as ServiceInvestigation[]);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    }
  };

  const loadTypeInconduiteOptions = async () => {
    try {
      const result = await invoke('get_dossiers');
      const dossiersData = result as Dossier[];
      const uniqueTypes = [...new Set(dossiersData.map(d => d.TypeInconduite).filter(Boolean))] as string[];

      const defaultTypes = [
        'Faute professionnelle',
        'Abus de pouvoir',
        'Corruption',
        'Négligence',
        'Absence injustifiée',
        'Insoumission',
        'Violation des consignes'
      ];

      const allTypes = [...new Set([...defaultTypes, ...uniqueTypes])];
      setTypeInconduiteOptions(allTypes);
    } catch (error) {
      console.error('Erreur chargement types inconduite:', error);
    }
  };

  const addNewTypeInconduite = (newType: string) => {
    if (newType && newType.trim() !== '') {
      const typeExists = typeInconduiteOptions.some(
        option => option.toLowerCase() === newType.toLowerCase()
      );

      if (!typeExists) {
        setTypeInconduiteOptions(prev => [...prev, newType]);
        form.setFieldValue('TypeInconduite', newType);
        notifications.show({
          title: 'Nouveau type ajouté',
          message: `"${newType}" a été ajouté aux options`,
          color: 'green',
          icon: <IconCheck size={16} />
        });
      }
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (!values.PersonnelID) {
        throw new Error("Veuillez sélectionner un agent");
      }

      const personnelId = Number(values.PersonnelID);
      const agentExists = agents.some(a => a.PersonnelID === personnelId);
      if (!agentExists) {
        notifications.show({
          title: 'Erreur',
          message: "L'agent sélectionné n'existe pas",
          color: 'red',
          icon: <IconX size={16} />
        });
        return;
      }

      let serviceId = null;
      if (values.ServiceInvestigation && values.ServiceInvestigation.trim() !== '') {
        const id = Number(values.ServiceInvestigation);
        if (!isNaN(id) && id > 0) {
          const serviceExists = services.some(s => s.ServiceID === id);
          if (serviceExists) {
            serviceId = id;
          }
        }
      }

      let rapportId = null;
      if (values.IDRapport && values.IDRapport.trim() !== '') {
        const id = Number(values.IDRapport);
        if (!isNaN(id) && id > 0) {
          const rapportExists = rapports.some(r => r.RapportID === id);
          if (rapportExists) {
            rapportId = id;
          }
        }
      }

      let acteSanctionPath = null;
      if (acteSanctionFile) {
        try {
          acteSanctionPath = await saveActeSanctionFile(acteSanctionFile);
        } catch (error) {
          notifications.show({
            title: 'Erreur',
            message: 'Impossible de sauvegarder le fichier',
            color: 'red',
            icon: <IconX size={16} />
          });
          return;
        }
      } else if (editingId && values.ActeSanction && values.ActeSanction !== '') {
        acteSanctionPath = values.ActeSanction;
      }

      const dossierData = {
        PersonnelID: personnelId,
        TypeInconduite: values.TypeInconduite || null,
        PeriodeInconduite: values.PeriodeInconduite || null,
        Annee: values.Annee ? Number(values.Annee) : null,
        ServiceInvestigation: serviceId,
        Etat: values.Etat || 'En cours',
        SuiteReservee: values.SuiteReservee || null,
        TypeSanction: values.TypeSanction || null,
        Sanction: values.Sanction || null,
        ActeSanction: acteSanctionPath,
        NumeroActeSanction: values.NumeroActeSanction || null,
        AutoriteSanction: values.AutoriteSanction || null,
        Observations: values.Observations || null,
        IDRapport: rapportId,
        DossierID: editingId || undefined,
      };

      if (editingId) {
        await invoke('update_dossier', { dossier: dossierData });
        notifications.show({ title: 'Succès', message: 'Dossier modifié', color: 'green', icon: <IconCheck size={16} /> });
      } else {
        await invoke('create_dossier', { dossier: dossierData });
        notifications.show({ title: 'Succès', message: 'Dossier créé', color: 'green', icon: <IconCheck size={16} /> });
      }

      setModalOpen(false);
      form.reset();
      setEditingId(null);
      setCurrentEtat('En cours');
      setActeSanctionFile(null);
      loadDossiers();

    } catch (error) {
      console.error('Erreur détaillée:', error);
      notifications.show({
        title: 'Erreur',
        message: `Erreur: ${error}`,
        color: 'red',
        icon: <IconX size={16} />
      });
    }
  };

  const handleDelete = async () => {
    if (!dossierToDelete) return;
    try {
      await invoke('delete_dossier', { id: dossierToDelete });
      notifications.show({ title: 'Succès', message: 'Dossier supprimé', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteModalOpen(false);
      setDossierToDelete(null);
      loadDossiers();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red', icon: <IconX size={16} /> });
    }
  };

  const getEtatColor = (etat?: string) => {
    switch (etat) {
      case 'Clôturé': return 'green';
      case 'En cours': return 'blue';
      case 'Suspendu': return 'orange';
      case 'Abandonné': return 'gray';
      default: return 'gray';
    }
  };

  const getTypeInconduiteColor = (type?: string) => {
    const colors: Record<string, string> = {
      'Faute professionnelle': 'red',
      'Abus de pouvoir': 'orange',
      'Corruption': 'darkred',
      'Négligence': 'yellow',
      'Absence injustifiée': 'gray',
    };
    return colors[type || ''] || 'blue';
  };

  // Ouvrir le modal d'impression avec objet personnalisé
  const openPrintModal = (orientation: 'portrait' | 'landscape') => {
    setPrintOrientation(orientation);
    setCustomObject('');
    setPrintModalOpen(true);
  };

  // Gestion de l'impression avec objet personnalisé
  const handlePrintWithCustomObject = () => {
    const rows = filteredDossiers.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${d.AgentMatricule || '-'}</td>
      <td>${d.AgentNom || ''} ${d.AgentPrenom || ''}</td>
      <td>${d.Grade || '-'}</td>
      <td>${d.TypeInconduite || '-'}</td>
      <td>${services.find(s => s.ServiceID === d.ServiceInvestigation)?.LibelleService || '-'}</td>
      <td>${d.Etat || '-'}</td>
      <td>${d.Sanction || '-'}</td>
    </tr>
    `).join('');

    // Utiliser l'objet personnalisé s'il est fourni
    const objetText = customObject.trim() || "LISTE DES DOSSIERS D'INCONDUITE";

    const content = `
      <div style="margin: 20px 0; font-weight: bold; font-size: 14px;">OBJET : ${objetText}</div>
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr style="background:#1b365d;color:white;">
            <th style="padding: 10px;">N°</th>
            <th style="padding: 10px;">Matricule</th>
            <th style="padding: 10px;">Agent</th>
            <th style="padding: 10px;">Grade</th>
            <th style="padding: 10px;">Inconduite</th>
            <th style="padding: 10px;">Service</th>
            <th style="padding: 10px;">État</th>
            <th style="padding: 10px;">Sanction</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    
    printDocument(content, objetText, printOrientation);
    setPrintModalOpen(false);
  };

  const exportToExcel = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));
    notifications.show({ title: 'Info', message: 'Export Excel à implémenter', color: 'blue' });
    setExporting(false);
  };

  const exportToPDF = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));
    notifications.show({ title: 'Info', message: 'Export PDF à implémenter', color: 'blue' });
    setExporting(false);
  };

  const exportToWord = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));
    notifications.show({ title: 'Info', message: 'Export Word à implémenter', color: 'blue' });
    setExporting(false);
  };

  const filteredDossiers = dossiers.filter(dossier => {
    const matchesSearch = `${dossier.AgentNom} ${dossier.AgentPrenom} ${dossier.AgentMatricule}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dossier.TypeInconduite && dossier.TypeInconduite.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEtat = !filterEtat || dossier.Etat === filterEtat;
    return matchesSearch && matchesEtat;
  });

  const totalPages = Math.ceil(filteredDossiers.length / itemsPerPage);
  const paginatedDossiers = filteredDossiers.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const normalize = (val: string) => val.trim().toLowerCase();
  const uniqueTypes = Array.from(new Map(typeInconduiteOptions.map((item) => [normalize(item), item.trim()])).values());

  const agentOptions = agents.map((a) => ({
    value: String(a.PersonnelID),
    label: `${a.Matricule} - ${a.Nom} ${a.Prenom}`,
  }));

  const moisOptions = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ].map(m => ({ value: m, label: m }));

  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Card withBorder radius="lg" p="xl">
          <Stack align="center" gap="md">
            <Loader size="xl" color="#1b365d" />
            <Text>Chargement des dossiers...</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          <PageHeader title="Gestion des Dossiers d'Inconduite" />

          <Transition mounted={true} transition="slide-down" duration={500}>
            {(styles) => <div style={styles}><DossierStatsCards dossiers={dossiers} /></div>}
          </Transition>

          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
              <Group grow style={{ flex: 2 }}>
                <TextInput
                  placeholder="Rechercher..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }}
                  size="sm"
                />
                <Select
                  placeholder="Filtrer par état"
                  value={filterEtat}
                  onChange={(val) => { setFilterEtat(val); setActivePage(1); }}
                  clearable
                  data={etatOptions}
                  size="sm"
                />
              </Group>

              <Group gap="sm" align="flex-end">
                <Tooltip label="Actualiser"><ActionIcon onClick={loadDossiers} size="lg" variant="light" color="blue"><IconRefresh size={18} /></ActionIcon></Tooltip>

                <Menu shadow="md" width={200}>
                  <Menu.Target><Button leftSection={<IconDownload size={16} />} variant="outline" loading={exporting}>Exporter</Button></Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconFileExcel size={16} color="#00a84f" />} onClick={exportToExcel}>Excel (.xlsx)</Menu.Item>
                    <Menu.Item leftSection={<IconFile size={16} color="#e74c3c" />} onClick={exportToPDF}>PDF (.pdf)</Menu.Item>
                    <Menu.Item leftSection={<IconFileWord size={16} color="#2980b9" />} onClick={exportToWord}>Word (.doc)</Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                <Menu shadow="md" width={150}>
                  <Menu.Target>
                    <Tooltip label="Imprimer">
                      <ActionIcon size="lg" variant="light" color="teal">
                        <IconPrinter size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => openPrintModal('portrait')}>🧾 Portrait</Menu.Item>
                    <Menu.Item onClick={() => openPrintModal('landscape')}>📄 Paysage</Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingId(null); form.reset(); setCurrentEtat('En cours'); setModalOpen(true); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                  Nouveau Dossier
                </Button>

                <Tooltip label="Instructions"><ActionIcon onClick={() => setInfoModalOpen(true)} size="lg" variant="light" color="gray"><IconInfoCircle size={18} /></ActionIcon></Tooltip>
              </Group>
            </Group>
            <Divider my="md" />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{filteredDossiers.length} dossier(s) trouvé(s)</Text>
              {searchTerm && <Button variant="subtle" size="xs" onClick={() => setSearchTerm('')}>Effacer</Button>}
            </Group>
          </Card>

          <Card withBorder radius="lg" p="0">
            <ScrollArea style={{ maxHeight: 500 }}>
              <Table striped highlightOnHover style={{ fontSize: '11px', minWidth: '1000px' }}>
                <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: 'white' }}>N°</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Matricule</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Nom Prénom</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Grade</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Inconduite</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Service</Table.Th>
                    <Table.Th style={{ color: 'white' }}>État</Table.Th>
                    <Table.Th style={{ color: 'white' }}>Sanction</Table.Th>
                    <Table.Th style={{ color: 'white', textAlign: 'center' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedDossiers.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={9}><Center py={50}><IconGavel size={48} color="gray" /><Text c="dimmed">Aucun dossier</Text></Center></Table.Td></Table.Tr>
                  ) : (
                    paginatedDossiers.map((d) => (
                      <Table.Tr key={d.DossierID}>
                        <Table.Td><Badge variant="light" color="blue" size="sm">{d.DossierID}</Badge></Table.Td>
                        <Table.Td><Text size="xs">{d.AgentMatricule || '-'}</Text></Table.Td>
                        <Table.Td><Group gap="xs"><Avatar size="xs" radius="xl" color="blue">{d.AgentNom?.charAt(0)}{d.AgentPrenom?.charAt(0)}</Avatar><Text size="xs" fw={500}>{d.AgentNom} {d.AgentPrenom}</Text></Group></Table.Td>
                        <Table.Td><Badge variant="light" color="cyan" size="xs">{d.Grade || '-'}</Badge></Table.Td>
                        <Table.Td><Badge color={getTypeInconduiteColor(d.TypeInconduite)} variant="light" size="xs">{d.TypeInconduite || '-'}</Badge></Table.Td>
                        <Table.Td><Text size="xs">{services.find(s => s.ServiceID === d.ServiceInvestigation)?.LibelleService || '-'}</Text></Table.Td>
                        <Table.Td><Badge color={getEtatColor(d.Etat)} variant="filled" size="xs">{d.Etat || 'En cours'}</Badge></Table.Td>
                        <Table.Td>
                          {d.Sanction ? (
                            <Badge color="red" variant="light" size="xs">{d.Sanction}</Badge>
                          ) : (
                            <Text c="dimmed" size="xs">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="center">
                            <Tooltip label="Voir"><ActionIcon onClick={() => { setSelectedDossier(d); setViewModalOpen(true); }} color="green" variant="light" size="sm"><IconEye size={16} /></ActionIcon></Tooltip>
                            <Tooltip label="Modifier">
                              <ActionIcon
                                onClick={() => {
                                  setEditingId(d.DossierID);
                                  setCurrentEtat(d.Etat || 'En cours');
                                  form.setValues({
                                    PersonnelID: d.PersonnelID.toString(),
                                    TypeInconduite: d.TypeInconduite || '',
                                    PeriodeInconduite: d.PeriodeInconduite || '',
                                    Annee: d.Annee || new Date().getFullYear(),
                                    ServiceInvestigation: d.ServiceInvestigation?.toString() || '',
                                    Etat: d.Etat || 'En cours',
                                    SuiteReservee: d.SuiteReservee || '',
                                    TypeSanction: d.TypeSanction || '',
                                    Sanction: d.Sanction || '',
                                    ActeSanction: d.ActeSanction || '',
                                    NumeroActeSanction: d.NumeroActeSanction || '',
                                    AutoriteSanction: d.AutoriteSanction || '',
                                    Observations: d.Observations || '',
                                    IDRapport: d.IDRapport?.toString() || '',
                                  });
                                  setModalOpen(true);
                                }}
                                color="blue"
                                variant="light"
                                size="sm"
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Supprimer"><ActionIcon onClick={() => { setDossierToDelete(d.DossierID); setDeleteModalOpen(true); }} color="red" variant="light" size="sm"><IconTrash size={16} /></ActionIcon></Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>

          {totalPages > 1 && <Group justify="center" mt="md"><Pagination total={totalPages} value={activePage} onChange={setActivePage} color="blue" size="sm" /></Group>}
        </Stack>
      </Container>

      {/* Modal Formulaire */}
      <Modal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); form.reset(); setCurrentEtat('En cours'); setActeSanctionFile(null); }}
        title={<Text fw={600} size="md">{editingId ? "Modifier le dossier" : "Nouveau dossier"}</Text>}
        size={700}
        centered
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="xs">
            <Select
              label="Agent concerné"
              placeholder="Sélectionner un agent"
              data={agentOptions}
              value={form.values.PersonnelID || null}
              onChange={(v) => form.setFieldValue("PersonnelID", v || "")}
              searchable
              required
              size="xs"
            />

            <Group align="flex-end" gap="xs" grow>
              <Select
                label="Type d'inconduite"
                placeholder="Sélectionner un type"
                data={uniqueTypes}
                searchable
                clearable
                size="xs"
                value={form.values.TypeInconduite}
                onChange={(v) => form.setFieldValue('TypeInconduite', v || '')}
              />
              <Button
                size="xs"
                variant="light"
                color="green"
                onClick={() => { const newType = prompt("Nouveau type d'inconduite:"); if (newType?.trim()) addNewTypeInconduite(newType.trim()); }}
                style={{ marginBottom: 2 }}
              >
                <IconPlus size={14} /> Ajouter
              </Button>
            </Group>

            <Grid >
              <Grid.Col span={4}>
                <TextInput
                  label="Année"
                  type="number"
                  placeholder={new Date().getFullYear().toString()}
                  {...form.getInputProps('Annee')}
                  size="xs"
                />
              </Grid.Col>
              <Grid.Col span={8}>
                <Select
                  label="Mois"
                  placeholder="Sélectionner"
                  data={moisOptions}
                  value={form.values.PeriodeInconduite}
                  onChange={(v) => form.setFieldValue('PeriodeInconduite', v || '')}
                  searchable
                  clearable
                  size="xs"
                />
              </Grid.Col>
            </Grid>

            <Select
              label="Service d'investigation"
              placeholder="Sélectionner un service"
              data={services.map(s => ({ value: s.ServiceID.toString(), label: s.LibelleService }))}
              value={form.values.ServiceInvestigation || null}
              onChange={(v) => form.setFieldValue('ServiceInvestigation', v || '')}
              searchable
              clearable
              size="xs"
            />

            <Select
              label="Rapport lié (optionnel)"
              placeholder="Sélectionner un rapport"
              data={rapports.map(r => ({ value: String(r.RapportID), label: `${r.NumeroRapport} - ${r.LibelleRapport.substring(0, 40)}` }))}
              value={form.values.IDRapport || null}
              onChange={(v) => form.setFieldValue('IDRapport', v || '')}
              searchable
              clearable
              size="xs"
            />

            <Grid >
              <Grid.Col span={5}>
                <Select
                  label="État du dossier"
                  data={etatOptions}
                  {...form.getInputProps('Etat')}
                  size="xs"
                  onChange={(v) => { form.setFieldValue('Etat', v); setCurrentEtat(v || 'En cours'); }}
                />
              </Grid.Col>
              <Grid.Col span={7}>
                <Select
                  label="Suite réservée"
                  placeholder="Sélectionner"
                  data={suiteReserveeOptions}
                  {...form.getInputProps('SuiteReservee')}
                  disabled={isEtatEnCours}
                  clearable
                  size="xs"
                />
              </Grid.Col>
            </Grid>

            {!isEtatEnCours && (
              <Card withBorder p="sm">
                <Grid >
                  <Grid.Col span={6}>
                    <Select
                      label="Type de sanction"
                      placeholder="Sélectionner un type"
                      data={typeSanctionOptions}
                      value={form.values.TypeSanction || null}
                      onChange={(v) => form.setFieldValue('TypeSanction', v || '')}
                      clearable
                      size="xs"
                      searchable
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Select
                      label="Sanction"
                      placeholder="Sélectionner une sanction"
                      data={sanctionOptions}
                      value={form.values.Sanction || null}
                      onChange={(v) => form.setFieldValue('Sanction', v || '')}
                      clearable
                      size="xs"
                      searchable
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="N° d'acte"
                      placeholder="Numéro de l'acte"
                      {...form.getInputProps('NumeroActeSanction')}
                      size="xs"
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <FileInput
                      label="Acte de sanction"
                      placeholder="Importer le document"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      value={acteSanctionFile}
                      onChange={setActeSanctionFile}
                      size="xs"
                      clearable
                      leftSection={<IconFile size={14} />}
                    />
                    {editingId && form.values.ActeSanction && !acteSanctionFile && (
                      <Text size="xs" c="dimmed" mt={2} truncate>
                        Actuel: {(form.values.ActeSanction as string).split(/[\\/]/).pop()}
                      </Text>
                    )}
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <TextInput
                      label="Autorité"
                      placeholder="Autorité ayant prononcé la sanction"
                      {...form.getInputProps('AutoriteSanction')}
                      size="xs"
                    />
                  </Grid.Col>
                </Grid>
              </Card>
            )}

            <Textarea
              label="Observations"
              placeholder="Observations éventuelles..."
              rows={2}
              {...form.getInputProps('Observations')}
              size="xs"
            />

            <Group justify="flex-end" mt="xs">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => { setModalOpen(false); form.reset(); setActeSanctionFile(null); }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="gradient"
                gradient={{ from: '#1b365d', to: '#2a4a7a' }}
              >
                {editingId ? 'Modifier' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Impression avec objet personnalisé */}
      <Modal
        opened={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
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
              placeholder="Ex: RAPPORT DES DOSSIERS D'INCONDUITE - 1ER TRIMESTRE 2025"
              value={customObject}
              onChange={(e) => setCustomObject(e.currentTarget.value)}
              minRows={3}
              maxRows={5}
              size="md"
              radius="md"
              autosize
            />
            
            <Text size="xs" c="dimmed">
              Si vous laissez vide, l'objet par défaut "LISTE DES DOSSIERS D'INCONDUITE" sera utilisé.
            </Text>
            
            <Divider />
            
            <Group justify="space-between" mt="md">
              <Button variant="light" onClick={() => setPrintModalOpen(false)} radius="md">
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

      {/* Modal Suppression */}
      <Modal opened={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setDossierToDelete(null); }} title="Confirmation" size="sm" centered>
        <Stack>
          <Alert color="red" variant="light">Supprimer ce dossier ?</Alert>
          <Text size="sm" c="dimmed" ta="center">Action irréversible.</Text>
          <Group justify="space-between">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setDossierToDelete(null); }}>Annuler</Button>
            <Button color="red" onClick={handleDelete}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Instructions */}
      <Modal opened={infoModalOpen} onClose={() => setInfoModalOpen(false)} title="Instructions" size="md" centered>
        <Stack>
          <Paper p="md" withBorder bg="blue.0">
            <Text fw={600}>📌 Fonctionnalités :</Text>
            <Stack gap="xs" mt="sm">
              <Text size="sm">1️⃣ Sélectionnez l'agent concerné</Text>
              <Text size="sm">2️⃣ Renseignez le type d'inconduite</Text>
              <Text size="sm">3️⃣ Choisissez le service d'investigation</Text>
              <Text size="sm">4️⃣ Pour ajouter une sanction, le dossier doit être "Clôturé" ou "Suspendu"</Text>
              <Text size="sm">5️⃣ Personnalisez l'objet avant impression</Text>
            </Stack>
          </Paper>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0</Text>
        </Stack>
      </Modal>

      {/* Modal Voir Détails */}
      <Modal opened={viewModalOpen} onClose={() => { setViewModalOpen(false); setSelectedDossier(null); }} title={<Group><IconEye size={20} /><Text>Dossier N° {selectedDossier?.DossierID}</Text>{selectedDossier && <Badge color={getEtatColor(selectedDossier.Etat)} variant="filled">{selectedDossier.Etat}</Badge>}</Group>} size="lg" centered styles={{ header: { backgroundColor: '#1b365d' }, title: { color: 'white' } }}>
        {selectedDossier && (
          <Stack>
            <Paper withBorder p="md">
              <Grid>
                <Grid.Col span={6}>
                  <Stack>
                    <Text size="xs" c="dimmed">Agent</Text>
                    <Group>
                      <Avatar size="sm" color="blue">{selectedDossier.AgentNom?.charAt(0)}{selectedDossier.AgentPrenom?.charAt(0)}</Avatar>
                      <Text fw={500}>{selectedDossier.AgentNom} {selectedDossier.AgentPrenom}</Text>
                    </Group>
                    <Text size="xs" c="dimmed">{selectedDossier.AgentMatricule} • {selectedDossier.Grade}</Text>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Stack>
                    <Text size="xs" c="dimmed">Inconduite</Text>
                    <Badge color={getTypeInconduiteColor(selectedDossier.TypeInconduite)}>{selectedDossier.TypeInconduite || '-'}</Badge>
                    <Text size="xs" c="dimmed">{selectedDossier.PeriodeInconduite} {selectedDossier.Annee}</Text>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Paper>

            <Paper withBorder p="md">
              <Grid>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Service</Text>
                  <Text>{services.find(s => s.ServiceID === selectedDossier.ServiceInvestigation)?.LibelleService || '-'}</Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Suite</Text>
                  <Badge color={selectedDossier.SuiteReservee === 'Sanctionné(e)' ? 'red' : 'gray'}>{selectedDossier.SuiteReservee || '-'}</Badge>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Rapport</Text>
                  <Text>{selectedDossier.IDRapport ? `N° ${selectedDossier.IDRapport}` : '-'}</Text>
                </Grid.Col>
              </Grid>
            </Paper>

            {selectedDossier.Sanction && (
              <Paper withBorder p="md" bg="red.0">
                <Text fw={600}>Sanction appliquée</Text>
                <Grid mt="sm">
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Type</Text>
                    <Text size="sm">{selectedDossier.TypeSanction || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Sanction</Text>
                    <Badge color="red">{selectedDossier.Sanction}</Badge>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">N° Acte</Text>
                    <Text size="sm">{selectedDossier.NumeroActeSanction || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Acte</Text>
                    {selectedDossier.ActeSanction ? <Button variant="subtle" size="xs" leftSection={<IconFile size={14} />} onClick={() => invoke('open_rapport_file', { filePath: selectedDossier.ActeSanction })}>Voir</Button> : <Text>-</Text>}
                  </Grid.Col>
                </Grid>
              </Paper>
            )}

            {selectedDossier.Observations && (
              <Paper withBorder p="md">
                <Text size="xs" c="dimmed">Observations</Text>
                <Text>{selectedDossier.Observations}</Text>
              </Paper>
            )}

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setViewModalOpen(false)}>Fermer</Button>
              <Button
                variant="gradient"
                gradient={{ from: '#1b365d', to: '#2a4a7a' }}
                onClick={() => {
                  const d = selectedDossier;
                  setViewModalOpen(false);
                  setEditingId(d.DossierID);
                  setCurrentEtat(d.Etat || 'En cours');
                  form.setValues({
                    PersonnelID: d.PersonnelID.toString(),
                    TypeInconduite: d.TypeInconduite || '',
                    PeriodeInconduite: d.PeriodeInconduite || '',
                    Annee: d.Annee || new Date().getFullYear(),
                    ServiceInvestigation: d.ServiceInvestigation?.toString() || '',
                    Etat: d.Etat || 'En cours',
                    SuiteReservee: d.SuiteReservee || '',
                    TypeSanction: d.TypeSanction || '',
                    Sanction: d.Sanction || '',
                    ActeSanction: d.ActeSanction || '',
                    NumeroActeSanction: d.NumeroActeSanction || '',
                    AutoriteSanction: d.AutoriteSanction || '',
                    Observations: d.Observations || '',
                    IDRapport: d.IDRapport?.toString() || '',
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
    </Box>
  );
}