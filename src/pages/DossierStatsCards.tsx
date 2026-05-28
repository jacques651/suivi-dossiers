// src/pages/DossierStatsCards.tsx
import { SimpleGrid, Card, Text, Group, ThemeIcon, Box, Progress } from '@mantine/core';
import { IconGavel, IconClock, IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { Dossier } from './Dossiers';

interface Props { 
  dossiers: Dossier[];
}

export default function DossierStatsCards({ dossiers }: Props) {
  const total = dossiers.length;
  const enCours = dossiers.filter(d => d.Etat === 'En cours').length;
  const suspendus = dossiers.filter(d => d.Etat === 'Suspendu').length;
  const clotures = dossiers.filter(d => d.Etat === 'Clôturé').length;
  const abandonnes = dossiers.filter(d => d.Etat === 'Abandonné').length;
  
  // Pourcentages pour la progression
  const pourcentageEnCours = total > 0 ? Math.round((enCours / total) * 100) : 0;
  const pourcentageSuspendus = total > 0 ? Math.round((suspendus / total) * 100) : 0;
  const pourcentageClotures = total > 0 ? Math.round((clotures / total) * 100) : 0;
  const pourcentageAbandonnes = total > 0 ? Math.round((abandonnes / total) * 100) : 0;

  return (
    <SimpleGrid 
      cols={{ base: 1, xs: 2, sm: 3, md: 5 }} 
      spacing="md"
      verticalSpacing="md"
    >
      {/* Carte 1 - Total Dossiers */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <IconGavel size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total</Text>
            <Text fw={700} size="xl">{total}</Text>
            <Text size="xs" c="dimmed">Dossiers</Text>
          </Box>
        </Group>
      </Card>

      {/* Carte 2 - En cours */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="green" variant="light">
            <IconClock size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>En cours</Text>
            <Text fw={700} size="xl">{enCours}</Text>
            <Progress value={pourcentageEnCours} size="xs" radius="xl" color="green" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 3 - Suspendus */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-orange-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="orange" variant="light">
            <IconAlertCircle size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Suspendus</Text>
            <Text fw={700} size="xl">{suspendus}</Text>
            <Progress value={pourcentageSuspendus} size="xs" radius="xl" color="orange" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 4 - Clôturés */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-violet-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="violet" variant="light">
            <IconCheck size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Clôturés</Text>
            <Text fw={700} size="xl">{clotures}</Text>
            <Progress value={pourcentageClotures} size="xs" radius="xl" color="violet" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 5 - Abandonnés */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-red-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="red" variant="light">
            <IconX size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Abandonnés</Text>
            <Text fw={700} size="xl">{abandonnes}</Text>
            <Progress value={pourcentageAbandonnes} size="xs" radius="xl" color="red" mt={4} />
          </Box>
        </Group>
      </Card>
    </SimpleGrid>
  );
}