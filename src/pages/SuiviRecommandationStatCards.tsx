// src/components/SuiviRecommandationStatCards.tsx
import { SimpleGrid, Card, Text, Group, ThemeIcon, Box, Progress } from '@mantine/core';
import { IconChecklist, IconCheck, IconClock, IconAlertCircle, IconX } from '@tabler/icons-react';

interface SuiviRecommandation {
  SuiviID: number;
  RecommandationID: number;
  NiveauMiseEnOeuvre?: string;
}

interface Props { 
  suivis: SuiviRecommandation[];
}

export default function SuiviRecommandationStatCards({ suivis }: Props) {
  const total = suivis.length;
  const realisees = suivis.filter(s => s.NiveauMiseEnOeuvre === 'Réalisée').length;
  const enCours = suivis.filter(s => s.NiveauMiseEnOeuvre === 'En cours').length;
  const enRetard = suivis.filter(s => s.NiveauMiseEnOeuvre === 'En retard').length;
  const bloquees = suivis.filter(s => s.NiveauMiseEnOeuvre === 'Bloquée').length;
  
  // Pourcentages pour la progression
  const pourcentageRealisees = total > 0 ? Math.round((realisees / total) * 100) : 0;
  const pourcentageEnCours = total > 0 ? Math.round((enCours / total) * 100) : 0;
  const pourcentageEnRetard = total > 0 ? Math.round((enRetard / total) * 100) : 0;
  const pourcentageBloquees = total > 0 ? Math.round((bloquees / total) * 100) : 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
      {/* Carte 1 - Total */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <IconChecklist size={20} />
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
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <IconClock size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>En cours</Text>
            <Text fw={700} size="xl">{enCours}</Text>
            <Progress value={pourcentageEnCours} size="xs" radius="xl" color="blue" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 4 - En retard */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-orange-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="orange" variant="light">
            <IconAlertCircle size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>En retard</Text>
            <Text fw={700} size="xl">{enRetard}</Text>
            <Progress value={pourcentageEnRetard} size="xs" radius="xl" color="orange" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 5 - Abandonnées */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-red-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="red" variant="light">
            <IconX size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Abandonnées</Text>
            <Text fw={700} size="xl">{bloquees}</Text>
            <Progress value={pourcentageBloquees} size="xs" radius="xl" color="red" mt={4} />
          </Box>
        </Group>
      </Card>
    </SimpleGrid>
  );
}