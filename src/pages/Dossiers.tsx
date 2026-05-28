import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, TextInput, Stack, Card,
  Group, ActionIcon, Select, Textarea, Badge, Grid, ComboboxItem,
  Avatar, Text, Divider, Loader, Pagination, Tooltip,
  Box, Container, Paper, 
  ScrollArea, Center, Alert, Menu, 
  Transition
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconEdit, IconTrash, IconPlus, IconEye, IconSearch,
  IconGavel,
  IconRefresh, IconDownload, IconPrinter,
  IconFileExcel, IconFile, IconFileWord, IconInfoCircle,
  IconCheck, IconX} from '@tabler/icons-react';
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
  ServiceInvestigation?: string;
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
  const itemsPerPage = 10;

  const [currentEtat, setCurrentEtat] = useState('En cours');
  const isEtatEnCours = currentEtat === 'En cours';

  // Options dynamiques
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
  const typeSanctionOptions = ['Sanction administrative', 'Sanction judiciaire', 'Sanction disciplinaire', 'Aucune'];
  const etatOptions = ['En cours', 'Suspendu', 'Clôturé', 'Abandonné'];

  const sanctionOptions = [
    'Avertissement',
    'Blâme',
    'Suspension',
    'Rétrogradation',
    'Révocation',
    'Licenciement',
    'Mutation',
    'Mise à pied',
    'Rappel à l\'ordre',
    'Exclusion temporaire',
    'Exclusion définitive'
  ];

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

  // Fonctions de chargement
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

  // Fonction pour ajouter un nouveau type d'inconduite
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

  // CRUD Operations
  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (!values.PersonnelID) {
        throw new Error("Veuillez sélectionner un agent");
      }

      // 🔥 Ajouter le nouveau type d'inconduite s'il n'existe pas
      if (values.TypeInconduite && values.TypeInconduite.trim() !== '') {
        const typeExists = typeInconduiteOptions.some(
          option => option.toLowerCase() === values.TypeInconduite.toLowerCase()
        );
        
        if (!typeExists) {
          setTypeInconduiteOptions(prev => [...prev, values.TypeInconduite]);
        }
      }

      const dossierData = {
        ...values,
        PersonnelID: Number(values.PersonnelID),
        Annee: values.Annee ? Number(values.Annee) : null,
        DossierID: editingId,
      };

      if (editingId) {
        await invoke('update_dossier', { dossier: dossierData });
        notifications.show({
          title: 'Succès',
          message: 'Dossier modifié avec succès',
          color: 'green',
          icon: <IconCheck size={16} />
        });
      } else {
        await invoke('create_dossier', { dossier: dossierData });
        notifications.show({
          title: 'Succès',
          message: 'Dossier créé avec succès',
          color: 'green',
          icon: <IconCheck size={16} />
        });
      }

      setModalOpen(false);
      form.reset();
      setEditingId(null);
      setCurrentEtat('En cours');
      loadDossiers();
      loadTypeInconduiteOptions();

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
    if (!dossierToDelete) return;
    try {
      await invoke('delete_dossier', { id: dossierToDelete });
      notifications.show({ title: 'Succès', message: 'Dossier supprimé avec succès', color: 'green', icon: <IconCheck size={16} /> });
      setDeleteModalOpen(false);
      setDossierToDelete(null);
      loadDossiers();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de supprimer le dossier', color: 'red', icon: <IconX size={16} /> });
    }
  };

  // Utilitaires
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

  // Exports
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

  const handlePrint = (orientation: 'portrait' | 'landscape') => {
    const rows = filteredDossiers.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${d.AgentMatricule || '-'}</td>
      <td>${d.AgentNom || ''} ${d.AgentPrenom || ''}</td>
      <td>${d.Grade || '-'}</td>
      <td>${d.TypeInconduite || '-'}</td>
      <td>${d.ServiceInvestigation || '-'}</td>
      <td>${d.Etat || '-'}</td>
      <td>${d.Sanction || '-'}</td>
    </tr>
  `).join('');

    const content = `
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr style="background:#1b365d;color:white;">
          <th>N°</th>
          <th>Matricule</th>
          <th>Agent</th>
          <th>Grade</th>
          <th>Inconduite</th>
          <th>Service</th>
          <th>État</th>
          <th>Sanction</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

    printDocument(content, 'LISTE DES DOSSIERS', orientation);
  };
  
  // Filtrage et pagination
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

  const uniqueTypes = Array.from(
    new Map(
      typeInconduiteOptions.map((item) => [
        normalize(item),
        item.trim()
      ])
    ).values()
  );

  const agentOptions = agents.map((a) => ({
    value: String(a.PersonnelID),
    label: `${a.Matricule} - ${a.Nom} ${a.Prenom}`,
  }));

  const moisOptions = [
    { value: "Janvier", label: "Janvier" },
    { value: "Février", label: "Février" },
    { value: "Mars", label: "Mars" },
    { value: "Avril", label: "Avril" },
    { value: "Mai", label: "Mai" },
    { value: "Juin", label: "Juin" },
    { value: "Juillet", label: "Juillet" },
    { value: "Août", label: "Août" },
    { value: "Septembre", label: "Septembre" },
    { value: "Octobre", label: "Octobre" },
    { value: "Novembre", label: "Novembre" },
    { value: "Décembre", label: "Décembre" },
  ];

  const serviceOptions: ComboboxItem[] = services.map(service => ({
    value: service.LibelleService,
    label: service.LibelleService
  }));

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
         <PageHeader 
  title="Dossiers Disciplinaires"
  subtitle="Gérez les dossiers disciplinaires des agents"
  rightContent={
    <Button 
      variant="light" 
      color="white" 
      leftSection={<IconInfoCircle size={18} />} 
      onClick={() => setInfoModalOpen(true)}
      style={{
        backgroundColor: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      Instructions
    </Button>
  }
/>

          <Transition mounted={true} transition="slide-down" duration={500} timingFunction="ease">
            {(styles) => (
              <div style={styles}>
                <DossierStatsCards dossiers={dossiers} />
              </div>
            )}
          </Transition>

          {/* Barre d'actions */}
          <Card withBorder radius="lg" shadow="sm" p="md">
            <Group justify="space-between" align="flex-end" mb="md">
              <Box>
                <Text fw={600} size="lg">Liste des dossiers</Text>
                <Text size="xs" c="dimmed">{filteredDossiers.length} dossier(s) trouvé(s)</Text>
              </Box>
              <Group>
                <Tooltip label="Actualiser">
                  <ActionIcon onClick={loadDossiers} size="lg" variant="light" color="blue">
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
                <Menu shadow="md" width={150}>
                  <Menu.Target>
                    <Tooltip label="Imprimer">
                      <ActionIcon size="lg" variant="light" color="teal">
                        <IconPrinter size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => handlePrint('portrait')}>
                      🧾 Portrait
                    </Menu.Item>
                    <Menu.Item onClick={() => handlePrint('landscape')}>
                      📄 Paysage
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingId(null); form.reset(); setCurrentEtat('En cours'); setModalOpen(true); loadTypeInconduiteOptions(); }} variant="gradient" gradient={{ from: '#1b365d', to: '#2a4a7a' }}>
                  Nouveau Dossier
                </Button>
              </Group>
            </Group>

            <Divider my="md" />

            {/* Filtres */}
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  placeholder="Rechercher par agent, matricule ou type d'inconduite..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.currentTarget.value); setActivePage(1); }}
                  size="sm"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Select
                  placeholder="Filtrer par état"
                  value={filterEtat}
                  onChange={(val) => { setFilterEtat(val); setActivePage(1); }}
                  clearable
                  data={etatOptions}
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
                style={{ fontSize: '11px', minWidth: '1000px' }}
              >
                <Table.Thead style={{ backgroundColor: '#1b365d' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: 'white', width: '70px', fontSize: '11px', padding: '8px 4px' }}>N°</Table.Th>
                    <Table.Th style={{ color: 'white', width: '30px', fontSize: '11px', padding: '6px 4px' }}>Matricule</Table.Th>
                    <Table.Th style={{ color: 'white', width: '150px', fontSize: '11px', padding: '8px 4px' }}>Nom Prénom</Table.Th>
                    <Table.Th style={{ color: 'white', width: '120px', fontSize: '11px', padding: '8px 4px' }}>Grade</Table.Th>
                    <Table.Th style={{ color: 'white', width: '150px', fontSize: '11px', padding: '8px 4px' }}>Type d'inconduite</Table.Th>
                    <Table.Th style={{ color: 'white', width: '160px', fontSize: '11px', padding: '8px 4px' }}>Service Investigation</Table.Th>
                    <Table.Th style={{ color: 'white', width: '70px', fontSize: '11px', padding: '8px 4px' }}>État</Table.Th>
                    <Table.Th style={{ color: 'white', width: '100px', fontSize: '11px', padding: '8px 4px' }}>Sanction</Table.Th>
                    <Table.Th style={{ color: 'white', width: '120px', fontSize: '11px', padding: '8px 4px', textAlign: 'center' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedDossiers.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={9}>
                        <Center py="xl">
                          <Stack align="center">
                            <IconGavel size={48} color="gray" />
                            <Text c="dimmed" size="sm">Aucun dossier trouvé</Text>
                          </Stack>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedDossiers.map((dossier) => (
                      <Table.Tr key={dossier.DossierID}>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Badge variant="light" color="blue" size="sm" radius="md">{dossier.DossierID}</Badge>
                        </Table.Td>
                        <Table.Td style={{ padding: '4px 4px' }}>
                          <Text size="xs" fw={500}>{dossier.AgentMatricule || '-'}</Text>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Group gap="xs" wrap="nowrap">
                            <Avatar size="xs" radius="xl" color="blue">
                              {dossier.AgentNom?.charAt(0)}{dossier.AgentPrenom?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Text size="xs" fw={500}>{dossier.AgentNom} {dossier.AgentPrenom}</Text>
                            </Box>
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Badge variant="light" color="cyan" size="xs">
                            {dossier.Grade || 'Non défini'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Badge color={getTypeInconduiteColor(dossier.TypeInconduite)} variant="light" size="xs">
                            {dossier.TypeInconduite || '-'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text size="xs" lineClamp={1}>{dossier.ServiceInvestigation || '-'}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Badge color={getEtatColor(dossier.Etat)} variant="filled" size="xs">
                            {dossier.Etat || 'En cours'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          {dossier.Sanction ? (
                            <Badge color="red" variant="light" size="xs">
                              {dossier.Sanction}
                            </Badge>
                          ) : (
                            <Text c="dimmed" size="xs">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td style={{ padding: '6px 4px' }}>
                          <Group gap="xs" justify="center" wrap="nowrap">
                            <Tooltip label="Voir détails" withArrow>
                              <ActionIcon
                                onClick={() => {
                                  console.log("Ouverture modal détails", dossier);
                                  setSelectedDossier(dossier);
                                  setViewModalOpen(true);
                                }}
                                color="green"
                                variant="light"
                                size="sm"
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Modifier" withArrow>
                              <ActionIcon
                                onClick={() => {
                                  setEditingId(dossier.DossierID);
                                  setCurrentEtat(dossier.Etat || 'En cours');
                                  form.setValues({
                                    PersonnelID: dossier.PersonnelID.toString(),
                                    TypeInconduite: dossier.TypeInconduite || '',
                                    PeriodeInconduite: dossier.PeriodeInconduite || '',
                                    Annee: dossier.Annee || new Date().getFullYear(),
                                    ServiceInvestigation: dossier.ServiceInvestigation || '',
                                    Etat: dossier.Etat || 'En cours',
                                    SuiteReservee: dossier.SuiteReservee || '',
                                    TypeSanction: dossier.TypeSanction || '',
                                    Sanction: dossier.Sanction || '',
                                    ActeSanction: dossier.ActeSanction || '',
                                    NumeroActeSanction: dossier.NumeroActeSanction || '',
                                    AutoriteSanction: dossier.AutoriteSanction || '',
                                    Observations: dossier.Observations || '',
                                    IDRapport: dossier.IDRapport?.toString() || '',
                                  });
                                  setModalOpen(true);
                                  loadTypeInconduiteOptions();
                                }}
                                color="blue"
                                variant="light"
                                size="sm"
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Supprimer" withArrow>
                              <ActionIcon
                                onClick={() => {
                                  setDossierToDelete(dossier.DossierID);
                                  setDeleteModalOpen(true);
                                }}
                                color="red"
                                variant="light"
                                size="sm"
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

      {/* Modal Formulaire - Version avec ajout de type d'inconduite par bouton */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          form.reset();
          setCurrentEtat('En cours');
        }}
        title={
          <Text fw={600} size="md">
            {editingId ? "Modifier le dossier" : "Nouveau dossier"}
          </Text>
        }
        size={650}
        centered
        scrollAreaComponent={ScrollArea.Autosize}
        styles={{
          body: { maxHeight: '75vh', overflowY: 'auto', padding: 16 },
        }}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* ================= AGENT ================= */}
            <Card withBorder radius="md" p="sm">
              <Select
                label="Agent concerné"
                placeholder="Sélectionner un agent"
                data={agentOptions}
                value={form.values.PersonnelID || null}
                onChange={(value) => {
                  form.setFieldValue("PersonnelID", value || "");
                }}
                searchable
                required
                size="sm"
              />
            </Card>

            {/* ================= INCONDUITE ================= */}
            <Card withBorder radius="md" p="sm">
              <Stack gap="xs">
                {/* Type d'inconduite avec bouton d'ajout */}
                <Group align="flex-end" gap="xs">
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Type d'inconduite"
                      placeholder="Sélectionner un type"
                      data={uniqueTypes}
                      searchable
                      clearable
                      size="sm"
                      value={form.values.TypeInconduite}
                      onChange={(val) => form.setFieldValue('TypeInconduite', val || '')}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    color="green"
                    onClick={() => {
                      const newType = prompt("Entrez le nouveau type d'inconduite:");
                      if (newType && newType.trim()) {
                        addNewTypeInconduite(newType.trim());
                      }
                    }}
                  >
                    <IconPlus size={16} />
                  </Button>
                </Group>

                {/* ANNÉE + MOIS */}
                <Grid>
                  <Grid.Col span={4}>
                    <TextInput
                      label="Année"
                      placeholder="2025"
                      type="number"
                      {...form.getInputProps('Annee')}
                      size="sm"
                    />
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Select
                      label="Mois"
                      placeholder="Sélectionner"
                      data={moisOptions}
                      value={form.values.PeriodeInconduite || null}
                      onChange={(val) =>
                        form.setFieldValue('PeriodeInconduite', val || '')
                      }
                      searchable
                      clearable
                      size="sm"
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>

            {/* ================= SUIVI ================= */}
            <Card withBorder radius="md" p="sm">
              <Select
                label="Service d'investigation"
                placeholder="Sélectionner"
                data={serviceOptions}
                {...form.getInputProps('ServiceInvestigation')}
                searchable
                clearable
                size="sm"
              />
              
              <Select
                label="Rapport lié"
                placeholder="Sélectionner un rapport (optionnel)"
                data={rapports.map(r => ({
                  value: String(r.RapportID),
                  label: `${r.NumeroRapport} - ${r.LibelleRapport} (${new Date(r.DateRapport).toLocaleDateString('fr-FR')})`
                }))}
                value={form.values.IDRapport || null}
                onChange={(value) => form.setFieldValue('IDRapport', value || '')}
                searchable
                clearable
                size="sm"
              />

              {/* ETAT + SUITE */}
              <Grid mt="xs">
                <Grid.Col span={4}>
                  <Select
                    label="État du dossier"
                    placeholder="État"
                    data={etatOptions}
                    {...form.getInputProps('Etat')}
                    size="sm"
                    onChange={(val) => {
                      form.setFieldValue('Etat', val);
                      setCurrentEtat(val || 'En cours');
                    }}
                  />
                </Grid.Col>

                <Grid.Col span={8}>
                  <Select
                    label="Suite réservée"
                    placeholder="Sélectionner"
                    data={suiteReserveeOptions}
                    {...form.getInputProps('SuiteReservee')}
                    disabled={isEtatEnCours}
                    clearable
                    size="sm"
                  />
                </Grid.Col>
              </Grid>
            </Card>

            {/* ================= SANCTION ================= */}
            {!isEtatEnCours && (
              <Card withBorder radius="md" p="sm">
                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Type de sanction"
                      data={typeSanctionOptions}
                      {...form.getInputProps('TypeSanction')}
                      size="sm"
                      clearable
                    />
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Select
                      label="Sanction"
                      data={sanctionOptions}
                      {...form.getInputProps('Sanction')}
                      size="sm"
                      clearable
                    />
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <TextInput
                      label="Acte"
                      {...form.getInputProps('ActeSanction')}
                      size="sm"
                    />
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <TextInput
                      label="Numéro"
                      {...form.getInputProps('NumeroActeSanction')}
                      size="sm"
                    />
                  </Grid.Col>

                  <Grid.Col span={12}>
                    <TextInput
                      label="Autorité"
                      {...form.getInputProps('AutoriteSanction')}
                      size="sm"
                    />
                  </Grid.Col>
                </Grid>
              </Card>
            )}

            {/* ================= OBSERVATIONS ================= */}
            <Textarea
              label="Observations"
              rows={2}
              {...form.getInputProps('Observations')}
              size="sm"
            />

            {/* ================= ACTIONS ================= */}
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpen(false);
                  form.reset();
                  setCurrentEtat('En cours');
                }}
              >
                Annuler
              </Button>

              <Button type="submit">
                {editingId ? 'Modifier' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDossierToDelete(null); }}
        title={
          <Group gap="sm">
            <IconTrash size={20} color="red" />
            <Text fw={700} size="lg">Confirmation de suppression</Text>
          </Group>
        }
        size="sm"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <Stack gap="md">
          <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
            Êtes-vous sûr de vouloir supprimer ce dossier ?
          </Alert>
          <Text size="sm" c="dimmed" ta="center">Cette action est irréversible.</Text>
          <Group justify="space-between" mt="md">
            <Button variant="light" onClick={() => { setDeleteModalOpen(false); setDossierToDelete(null); }}>Annuler</Button>
            <Button color="red" onClick={handleDelete} leftSection={<IconTrash size={16} />}>Supprimer</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Instructions */}
      <Modal
        opened={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={
          <Group gap="sm">
            <IconInfoCircle size={20} color="#1b365d" />
            <Text fw={700} size="lg">Instructions</Text>
          </Group>
        }
        size="md"
        centered
        overlayProps={{ blur: 3 }}
        transitionProps={{ transition: 'fade', duration: 200 }}
      >
        <Stack gap="md">
          <Paper p="md" radius="md" withBorder bg="blue.0">
            <Text fw={600} size="sm" mb="md">📌 Fonctionnalités :</Text>
            <Stack gap="xs">
              <Text size="sm">1️⃣ Sélectionnez l'agent concerné par le dossier disciplinaire</Text>
              <Text size="sm">2️⃣ Renseignez le type d'inconduite (liste dynamique avec ajout possible via le bouton "+")</Text>
              <Text size="sm">3️⃣ Choisissez le service d'investigation dans la liste déroulante</Text>
              <Text size="sm">4️⃣ Pour ajouter une sanction, le dossier doit être à l'état "Clôturé" ou "Suspendu"</Text>
              <Text size="sm">5️⃣ La suite réservée et les sanctions ne sont modifiables qu'après clôture</Text>
              <Text size="sm">6️⃣ Exportez la liste au format Excel, PDF ou Word</Text>
            </Stack>
          </Paper>
          <Divider />
          <Text size="xs" c="dimmed" ta="center">Version 2.0.0 - Suivi Dossiers</Text>
        </Stack>
      </Modal>

      {/* Modal Voir Détails */}
      <Modal
        opened={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedDossier(null); }}
        title={
          <Group gap="sm">
            <IconEye size={20} color="white" />
            <Text fw={700} size="lg" c="white">Dossier N° {selectedDossier?.DossierID}</Text>
            {selectedDossier && (
              <Badge color={getEtatColor(selectedDossier.Etat)} variant="filled" size="lg" ml="auto">
                {selectedDossier.Etat || 'En cours'}
              </Badge>
            )}
          </Group>
        }
        size="lg"
        centered
        styles={{
          header: { backgroundColor: '#1b365d', padding: '16px 24px' },
          title: { color: 'white', fontWeight: 600 },
          body: { padding: '24px' },
        }}
      >
        {selectedDossier && (
          <Stack gap="md">
            {/* Carte Agent + Inconduite */}
            <Paper p="md" radius="md" withBorder>
              <Grid>
                <Grid.Col span={6}>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Agent concerné</Text>
                    <Group gap="xs">
                      <Avatar size="sm" radius="xl" color="blue">
                        {selectedDossier.AgentNom?.charAt(0)}{selectedDossier.AgentPrenom?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Text size="sm" fw={600}>{selectedDossier.AgentNom} {selectedDossier.AgentPrenom}</Text>
                        <Text size="xs" c="dimmed">{selectedDossier.AgentMatricule} • {selectedDossier.Grade || 'Sans grade'}</Text>
                      </Box>
                    </Group>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Inconduite</Text>
                    <Badge color={getTypeInconduiteColor(selectedDossier.TypeInconduite)} variant="light" size="md" mb={2}>
                      {selectedDossier.TypeInconduite || 'Non spécifié'}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {selectedDossier.PeriodeInconduite || 'Période non précisée'}{selectedDossier.Annee ? ` ${selectedDossier.Annee}` : ''}
                    </Text>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Carte Suivi */}
            <Paper p="md" radius="md" withBorder>
              <Grid>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Service investigation</Text>
                  <Text size="sm" fw={500}>{selectedDossier.ServiceInvestigation || 'Non renseigné'}</Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Suite réservée</Text>
                  <Badge color={selectedDossier.SuiteReservee === 'Sanctionné(e)' ? 'red' : selectedDossier.SuiteReservee === 'Acquitté(e)' ? 'green' : 'gray'} variant="light" size="sm">
                    {selectedDossier.SuiteReservee || 'En attente'}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Rapport lié</Text>
                  <Text size="sm" fw={500}>{selectedDossier.IDRapport ? `N° ${selectedDossier.IDRapport}` : 'Aucun'}</Text>
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Carte Sanction (si présente) */}
            {selectedDossier.Sanction && (
              <Paper p="md" radius="md" withBorder bg="red.0" style={{ borderLeft: '4px solid #e03131' }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="sm">⚖️ Sanction appliquée</Text>
                <Grid>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Type</Text>
                    <Text size="sm" fw={500}>{selectedDossier.TypeSanction || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Sanction</Text>
                    <Badge color="red" variant="filled" size="sm">{selectedDossier.Sanction}</Badge>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">Acte</Text>
                    <Text size="sm" fw={500}>{selectedDossier.ActeSanction || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text size="xs" c="dimmed">N° Acte</Text>
                    <Text size="sm" fw={500}>{selectedDossier.NumeroActeSanction || '-'}</Text>
                  </Grid.Col>
                  <Grid.Col span={12} mt="xs">
                    <Text size="xs" c="dimmed">Autorité</Text>
                    <Text size="sm" fw={500}>{selectedDossier.AutoriteSanction || '-'}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            )}

            {/* Carte Observations (si présentes) */}
            {selectedDossier.Observations && (
              <Paper p="md" radius="md" withBorder bg="gray.0">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>📝 Observations</Text>
                <Text size="sm">{selectedDossier.Observations}</Text>
              </Paper>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => { setViewModalOpen(false); setSelectedDossier(null); }}>Fermer</Button>
              <Button
                variant="gradient"
                gradient={{ from: '#1b365d', to: '#2a4a7a' }}
                leftSection={<IconEdit size={16} />}
                onClick={() => {
                  const dossier = selectedDossier;
                  setViewModalOpen(false);
                  setEditingId(dossier.DossierID);
                  setCurrentEtat(dossier.Etat || 'En cours');
                  form.setValues({
                    PersonnelID: dossier.PersonnelID.toString(),
                    TypeInconduite: dossier.TypeInconduite || '',
                    PeriodeInconduite: dossier.PeriodeInconduite || '',
                    Annee: dossier.Annee || new Date().getFullYear(),
                    ServiceInvestigation: dossier.ServiceInvestigation || '',
                    Etat: dossier.Etat || 'En cours',
                    SuiteReservee: dossier.SuiteReservee || '',
                    TypeSanction: dossier.TypeSanction || '',
                    Sanction: dossier.Sanction || '',
                    ActeSanction: dossier.ActeSanction || '',
                    NumeroActeSanction: dossier.NumeroActeSanction || '',
                    AutoriteSanction: dossier.AutoriteSanction || '',
                    Observations: dossier.Observations || '',
                    IDRapport: dossier.IDRapport?.toString() || '',
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