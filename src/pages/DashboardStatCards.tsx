// src/components/DashboardStatCards.tsx
import { SimpleGrid, Card, Text, Group, ThemeIcon, Box } from '@mantine/core';
import { IconUsers, IconFileText, IconChecklist, IconGavel } from '@tabler/icons-react';

interface Stats {
  totalAgents: number;
  totalRapports: number;
  totalRecommandations: number;
  totalDossiers: number;
}

interface Props { 
  stats: Stats;
  onNavigate?: (page: string) => void;
}

export default function DashboardStatCards({ stats, onNavigate }: Props) {
  const kpiItems = [
    { 
      label: 'Agents', 
      value: stats.totalAgents, 
      icon: IconUsers, 
      color: 'blue', 
      bg: 'linear-gradient(135deg, #e8f4fd 0%, #d4e8f7 100%)',
      page: 'agents',
      description: 'agents enregistrés'
    },
    { 
      label: 'Rapports', 
      value: stats.totalRapports, 
      icon: IconFileText, 
      color: 'green', 
      bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6d9 100%)',
      page: 'rapports',
      description: 'rapports d\'inspection'
    },
    { 
      label: 'Recommandations', 
      value: stats.totalRecommandations, 
      icon: IconChecklist, 
      color: 'orange', 
      bg: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      page: 'recommandations',
      description: 'recommandations émises'
    },
    { 
      label: 'Dossiers', 
      value: stats.totalDossiers, 
      icon: IconGavel, 
      color: 'violet', 
      bg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      page: 'dossiers',
      description: 'dossiers disciplinaires'
    }
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
      {kpiItems.map((item) => (
        <Card 
          key={item.label}
          withBorder 
          radius="lg" 
          shadow="sm" 
          p="md" 
          style={{ 
            borderLeft: `4px solid var(--mantine-color-${item.color}-6)`,
            background: item.bg,
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onClick={() => onNavigate?.(item.page)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="lg" radius="md" color={item.color} variant="light">
              <item.icon size={20} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                {item.label}
              </Text>
              <Text fw={700} size="xl">{item.value}</Text>
              <Text size="xs" c="dimmed" mt={4}>{item.description}</Text>
            </Box>
          </Group>
        </Card>
      ))}
    </SimpleGrid>
  );
}