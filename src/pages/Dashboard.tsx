import { useEffect, useState } from 'react';
import {
  Grid, Paper, Text, Title, RingProgress, Group, SimpleGrid,
  Card, ThemeIcon, Stack, Divider, Progress, Badge,
  Center, Avatar, Box, Container, LoadingOverlay, Button
} from '@mantine/core';
import {
  IconFileText, IconUsers, IconChecklist, IconAlertCircle,
  IconReport, IconGavel, IconChartBar, IconTrendingUp,
  IconCheck, IconClock, IconX, IconBuilding, IconDashboard,
  IconListCheck, IconPlus, IconEye, IconCategory
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import DashboardStatCards from './DashboardStatCards';


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
    invoke('get_statistiques')
      .then((data) => setStats(data as Stats))
      .catch(console.error)
      .finally(() => setLoading(false));
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
          {/* Header */}
          <Card withBorder radius="lg" p="xl" style={{ background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)' }}>
            <Group justify="space-between">
              <Group gap="md">
                <Avatar size={60} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <IconChartBar size={30} color="white" />
                </Avatar>
                <Box>
                  <Title order={1} c="white" size="h2">Tableau de bord</Title>
                  <Text c="gray.3" size="sm">Vue d'ensemble de l'activité d'inspection</Text>
                  <Group gap="xs" mt={8}>
                    <Badge variant="white" color="blue">{new Date().toLocaleDateString('fr-FR')}</Badge>
                    <Badge variant="white" color="green">Synthèse en temps réel</Badge>
                  </Group>
                </Box>
              </Group>
              <Button variant="light" color="white" leftSection={<IconCategory size={18} />} onClick={() => onNavigate?.('referentiels')}>
                Configuration
              </Button>
            </Group>
          </Card>

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