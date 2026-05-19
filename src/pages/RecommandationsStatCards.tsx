// src/pages/RecommandationsStatCards.tsx
import { SimpleGrid, Card, Text, Group, ThemeIcon, Box, Progress } from '@mantine/core';
import { IconListCheck, IconCheck, IconClock, IconAlertCircle } from '@tabler/icons-react';
import { Recommandation } from './Recommandations';

interface Props { 
  recommandations: Recommandation[];
}

export default function RecommandationsStatCards({ recommandations }: Props) {
  const total = recommandations.length;
  const realisees = recommandations.filter(r => r.NiveauMiseEnOeuvre === 'Réalisée').length;
  const enCours = recommandations.filter(r => r.NiveauMiseEnOeuvre === 'En cours').length;
  const nonRealisees = recommandations.filter(r => 
    r.NiveauMiseEnOeuvre === 'Non commencé' || 
    r.NiveauMiseEnOeuvre === 'Abandonnée' ||
    r.NiveauMiseEnOeuvre === 'Partiellement réalisée'
  ).length;
  
  // Pourcentages pour la progression
  const pourcentageRealisees = total > 0 ? Math.round((realisees / total) * 100) : 0;
  const pourcentageEnCours = total > 0 ? Math.round((enCours / total) * 100) : 0;
  const pourcentageNonRealisees = total > 0 ? Math.round((nonRealisees / total) * 100) : 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
      {/* Carte 1 - Total Recommandations */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <IconListCheck size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total</Text>
            <Text fw={700} size="xl">{total}</Text>
            <Text size="xs" c="dimmed">Recommandations</Text>
          </Box>
        </Group>
      </Card>

      {/* Carte 2 - Réalisées */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="green" variant="light">
            <IconCheck size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Réalisées</Text>
            <Text fw={700} size="xl">{realisees}</Text>
            <Progress value={pourcentageRealisees} size="xs" radius="xl" color="green" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 3 - En cours */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-orange-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="orange" variant="light">
            <IconClock size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>En cours</Text>
            <Text fw={700} size="xl">{enCours}</Text>
            <Progress value={pourcentageEnCours} size="xs" radius="xl" color="orange" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 4 - Non réalisées */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-red-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="red" variant="light">
            <IconAlertCircle size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Non réalisées</Text>
            <Text fw={700} size="xl">{nonRealisees}</Text>
            <Progress value={pourcentageNonRealisees} size="xs" radius="xl" color="red" mt={4} />
          </Box>
        </Group>
      </Card>
    </SimpleGrid>
  );
}