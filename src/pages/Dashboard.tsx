import { useEffect, useState } from 'react';
import {
  Grid, Paper, Text, Title, RingProgress, Group, SimpleGrid,
  Card, ThemeIcon, Stack, Divider, Progress, Badge,
  Center, Box, Container, LoadingOverlay, Button
} from '@mantine/core';
import {
  IconFileText, IconUsers, IconChecklist, IconAlertCircle,
  IconReport, IconGavel, IconTrendingUp,
  IconCheck, IconClock, IconX, IconBuilding, IconDashboard,
  IconListCheck, IconPlus, IconEye
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import DashboardStatCards from './DashboardStatCards';
import { notifications } from '@mantine/notifications';
import PageHeader from '../components/PageHeader';


export interface Stats {
  totalAgents: number;
  totalRapports: number;
  totalRecommandations: number;
  totalDossiers: number;
  recommandationsRealisees: number;
  recommandationsEnCours: number;
  recommandationsNonRealisees: number;
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

const formatNumber = (v?: number) => (v || 0).toLocaleString('fr-FR');

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalAgents: 0, totalRapports: 0, totalRecommandations: 0,
    totalDossiers: 0, recommandationsRealisees: 0,
    recommandationsEnCours: 0, recommandationsNonRealisees: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await invoke<Stats>('get_statistiques');
        console.log('Stats chargées:', data);
        setStats(data);
      } catch (error) {
        console.error('Erreur chargement stats:', error);
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de charger les statistiques',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const totalRecommandations = stats.totalRecommandations || 1;
  const tauxRealisation = (stats.recommandationsRealisees / totalRecommandations) * 100;
  const tauxProgression = ((stats.recommandationsRealisees + stats.recommandationsEnCours) / totalRecommandations) * 100;
  const pourcentageAgentsAvecDossier = stats.totalAgents ? Math.round((stats.totalDossiers / stats.totalAgents) * 100) : 0;


  if (loading) return (
    <Center style={{ height: '50vh' }}>
      <Card withBorder radius="lg" p="xl">
        <LoadingOverlay visible />
        <Stack align="center" gap="md">
          <IconDashboard size={40} />
          <Text>Chargement du tableau de bord...</Text>
        </Stack>
      </Card>
    </Center>
  );

  return (
    <Box p="md">
      <Container size="full">
        <Stack gap="lg">
          <PageHeader
            title="Tableau de bord de suivi de dossiers d'inconduite"
            subtitle={`${stats.totalAgents} agents • ${stats.totalDossiers} dossiers • ${stats.totalRecommandations} recommandations • ${new Date().toLocaleDateString('fr-FR')}`}
            rightContent={
              <Group gap="sm">
                <Badge
                  size="lg"
                  variant="light"
                  color={tauxRealisation >= 75 ? "green" : tauxRealisation >= 50 ? "orange" : "red"}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '8px 16px'
                  }}
                >
                  {tauxRealisation.toFixed(1)}% de recommandations réalisées
                </Badge>
                <Button
                  variant="light"
                  color="white"
                  size="sm"
                  onClick={() => window.location.reload()}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Actualiser
                </Button>
              </Group>
            }
          />
          {/* Cartes Statistiques */}
          <DashboardStatCards stats={stats} onNavigate={onNavigate} />

          {/* Taux de réalisation + Synthèse rapide */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="lg" shadow="sm" p="xl" h="100%">
                <Group mb="md">
                  <ThemeIcon size="md" radius="md" color="teal" variant="light"><IconTrendingUp size={16} /></ThemeIcon>
                  <Title order={3} size="h4">📊 Taux de réalisation</Title>
                  <Badge color={tauxRealisation >= 75 ? "green" : tauxRealisation >= 50 ? "orange" : "red"} variant="filled" ml="auto">
                    {tauxRealisation >= 75 ? "✅ Bon" : tauxRealisation >= 50 ? "⚠️ Moyen" : "🔴 Mauvais"}
                  </Badge>
                </Group>
                <Divider mb="md" />
                <Group justify="center">
                  <RingProgress size={220} thickness={20} sections={[{ value: tauxRealisation, color: 'teal' }]} label={
                    <Stack align="center" gap={0}>
                      <Text ta="center" fw={800} size="xl">{tauxRealisation.toFixed(1)}%</Text>
                      <Text size="xs" c="dimmed">Complétées</Text>
                    </Stack>
                  } />
                </Group>
                <Stack gap="md" mt="xl">
                  {[
                    { label: 'Réalisées', value: stats.recommandationsRealisees, icon: IconCheck, color: 'green', percent: tauxRealisation },
                    { label: 'En cours', value: stats.recommandationsEnCours, icon: IconClock, color: 'orange', percent: (stats.recommandationsEnCours / totalRecommandations) * 100 },
                    { label: 'Non réalisées', value: stats.recommandationsNonRealisees, icon: IconX, color: 'red', percent: (stats.recommandationsNonRealisees / totalRecommandations) * 100 }
                  ].map(status => (
                    <Group key={status.label} justify="space-between">
                      <Group gap="xs">
                        <ThemeIcon size="sm" radius="xl" color={status.color} variant="light"><status.icon size={18} /></ThemeIcon>
                        <Text size="sm" fw={500}>{status.label}</Text>
                      </Group>
                      <Group gap="md">
                        <Text fw={700} size="lg" c={status.color}>{formatNumber(status.value)}</Text>
                        <Text size="sm" c="dimmed">{status.percent.toFixed(1)}%</Text>
                      </Group>
                    </Group>
                  ))}
                  <Divider />
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>Taux de progression</Text>
                    <Text fw={700} size="lg" c="blue">{tauxProgression.toFixed(1)}%</Text>
                  </Group>
                  <Progress value={tauxProgression} size="lg" radius="xl" color="blue" striped animated />
                </Stack>
                <Button fullWidth mt="xl" variant="light" color="blue" leftSection={<IconEye size={16} />} onClick={() => onNavigate?.('recommandations')}>
                  Voir toutes les recommandations
                </Button>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder radius="lg" shadow="sm" p="xl" h="100%">
                <Group mb="md">
                  <ThemeIcon size="md" radius="md" color="violet" variant="light"><IconReport size={16} /></ThemeIcon>
                  <Title order={3} size="h4">📋 Synthèse rapide</Title>
                </Group>
                <Divider mb="md" />
                <Stack gap="lg">
                  {[
                    { icon: IconBuilding, color: 'blue', bg: 'blue.0', title: 'Taux de recommandations', value: `${tauxRealisation.toFixed(1)}%`, desc: `${stats.recommandationsRealisees} sur ${stats.totalRecommandations} réalisées`, page: 'recommandations' },
                    { icon: IconListCheck, color: 'orange', bg: 'orange.0', title: 'Recommandations en attente', value: stats.recommandationsEnCours + stats.recommandationsNonRealisees, desc: `${stats.recommandationsEnCours} en cours, ${stats.recommandationsNonRealisees} non réalisées`, page: 'recommandations' },
                    { icon: IconUsers, color: 'green', bg: 'green.0', title: 'Agents avec dossiers', value: `${pourcentageAgentsAvecDossier}%`, desc: `${stats.totalDossiers} dossiers pour ${stats.totalAgents} agents`, page: 'agents' }
                  ].map(item => (
                    <Paper key={item.title} p="md" radius="md" withBorder bg={item.bg} style={{ cursor: 'pointer' }} onClick={() => onNavigate?.(item.page)}>
                      <Group wrap="nowrap">
                        <ThemeIcon size="xl" radius="md" color={item.color} variant="light"><item.icon size={24} /></ThemeIcon>
                        <Box style={{ flex: 1 }}>
                          <Text size="xs" c="dimmed">{item.title}</Text>
                          <Text fw={700} size="28px" c={item.color}>{item.value}</Text>
                          <Text size="xs" c="dimmed">{item.desc}</Text>
                        </Box>
                      </Group>
                    </Paper>
                  ))}
                  <Divider />
                  <Group justify="space-between" grow>
                    {[
                      { label: '✓ Réalisées', value: stats.recommandationsRealisees, color: 'teal', page: 'recommandations' },
                      { label: '⟳ En cours', value: stats.recommandationsEnCours, color: 'orange', page: 'recommandations' },
                      { label: '✗ Non réalisées', value: stats.recommandationsNonRealisees, color: 'red', page: 'recommandations' }
                    ].map(item => (
                      <Paper key={item.label} p="sm" radius="md" withBorder ta="center" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.(item.page)}>
                        <Text size="lg" fw={800} c={item.color}>{formatNumber(item.value)}</Text>
                        <Text size="xs" c="dimmed">{item.label}</Text>
                      </Paper>
                    ))}
                  </Group>
                </Stack>
                <Button fullWidth mt="xl" variant="light" color="violet" leftSection={<IconPlus size={16} />} onClick={() => onNavigate?.('dossiers')}>
                  Nouveau dossier disciplinaire
                </Button>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Indicateurs supplémentaires */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            {[
              { icon: IconCheck, color: 'green', title: 'Efficacité', value: `${tauxRealisation.toFixed(1)}%`, desc: 'Taux de succès des recommandations', progress: (stats.recommandationsRealisees / totalRecommandations) * 100, page: 'recommandations' },
              { icon: IconAlertCircle, color: 'red', title: 'Attention', value: stats.recommandationsNonRealisees, desc: 'Recommandations non réalisées', progress: (stats.recommandationsNonRealisees / totalRecommandations) * 100, page: 'recommandations' },
              { icon: IconUsers, color: 'blue', title: 'Agents', value: stats.totalAgents, desc: 'Agents enregistrés', progress: 100, page: 'agents' }
            ].map(item => (
              <Paper key={item.title} p="md" radius="lg" withBorder style={{ cursor: 'pointer' }} onClick={() => onNavigate?.(item.page)}>
                <Group gap="xs" mb="xs">
                  <item.icon size={18} color={item.color} />
                  <Text size="sm" fw={500}>{item.title}</Text>
                </Group>
                <Text fw={800} size="24px">{item.value}</Text>
                <Text size="xs" c="dimmed">{item.desc}</Text>
                <Progress value={item.progress} size="sm" radius="xl" color={item.color} mt={8} />
              </Paper>
            ))}
          </SimpleGrid>

          {/* Pied de page */}
          <Card withBorder radius="lg" p="md" bg="gray.0">
            <Group justify="center" gap="xl">
              {[
                { label: `${stats.totalAgents} agents`, icon: IconUsers, page: 'agents' },
                { label: `${stats.totalRapports} rapports`, icon: IconFileText, page: 'rapports' },
                { label: `${stats.totalRecommandations} recommandations`, icon: IconChecklist, page: 'recommandations' },
                { label: `${stats.totalDossiers} dossiers`, icon: IconGavel, page: 'dossiers' }
              ].map(item => (
                <Group key={item.label} gap="xs" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.(item.page)}>
                  <item.icon size={14} />
                  <Text size="xs" c="dimmed">{item.label}</Text>
                </Group>
              ))}
            </Group>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}