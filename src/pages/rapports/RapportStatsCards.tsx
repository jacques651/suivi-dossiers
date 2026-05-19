// src/pages/rapports/RapportStatsCards.tsx
import { SimpleGrid, Card, Text, Group, ThemeIcon, Box, Progress } from '@mantine/core';
import { IconFileText, IconCalendar, IconCategory, IconTrendingUp } from '@tabler/icons-react';

import dayjs from 'dayjs';

interface Props {
  rapports: {
    DateRapport: string;
    TypeInspection: string;
  }[];
}

export default function RapportStatsCards({ rapports }: Props) {
  const total = rapports.length;
  const typeCount = [...new Set(rapports.map(r => r.TypeInspection).filter(Boolean))].length;
  const thisYearCount = rapports.filter(r => dayjs(r.DateRapport).year() === dayjs().year()).length;
  const avgPerYear = Math.round(total / Math.max(1, dayjs().year() - 2020));
  
  // Pourcentage pour l'année en cours
  const pourcentageAnnuel = total > 0 ? Math.round((thisYearCount / total) * 100) : 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
      {/* Carte 1 - Total Rapports */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <IconFileText size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Rapports</Text>
            <Text fw={700} size="xl">{total}</Text>
            <Text size="xs" c="dimmed">{typeCount} types</Text>
          </Box>
        </Group>
      </Card>

      {/* Carte 2 - Cette année */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="green" variant="light">
            <IconCalendar size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Cette année</Text>
            <Text fw={700} size="xl">{thisYearCount}</Text>
            <Progress value={pourcentageAnnuel} size="xs" radius="xl" color="green" mt={4} />
          </Box>
        </Group>
      </Card>

      {/* Carte 3 - Types */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-orange-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="orange" variant="light">
            <IconCategory size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Types</Text>
            <Text fw={700} size="xl">{typeCount}</Text>
            <Text size="xs" c="dimmed">Types différents</Text>
          </Box>
        </Group>
      </Card>

      {/* Carte 4 - Moyenne / an */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-violet-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="violet" variant="light">
            <IconTrendingUp size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Moyenne / an</Text>
            <Text fw={700} size="xl">{avgPerYear}</Text>
            <Text size="xs" c="dimmed">Rapports par an</Text>
          </Box>
        </Group>
      </Card>

      {/* Carte 5 - Répartition (optionnelle) */}
      <Card withBorder radius="lg" shadow="sm" p="md" style={{ borderLeft: '4px solid var(--mantine-color-cyan-6)' }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size="lg" radius="md" color="cyan" variant="light">
            <IconCalendar size={20} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Répartition</Text>
            <Text fw={700} size="xl">{Math.round((thisYearCount / Math.max(1, total)) * 100)}%</Text>
            <Text size="xs" c="dimmed">des rapports en {dayjs().year()}</Text>
          </Box>
        </Group>
      </Card>
    </SimpleGrid>
  );
}