import { SimpleGrid, Card, Text, Group, ThemeIcon, Badge } from '@mantine/core';
import { IconUsers, IconFileText, IconListCheck, IconGavel, IconTrendingUp } from '@tabler/icons-react';

interface DashboardStatCardsProps {
  stats: {
    totalAgents: number;
    totalRapports: number;
    totalRecommandations: number;
    totalDossiers: number;
    recommandationsRealisees: number;
    recommandationsEnCours: number;
    recommandationsNonRealisees: number;
  };
  onNavigate?: (page: string) => void;
}

export default function DashboardStatCards({ stats, onNavigate }: DashboardStatCardsProps) {
  const tauxRealisation = stats.totalRecommandations > 0 
    ? (stats.recommandationsRealisees / stats.totalRecommandations) * 100 
    : 0;

  const cards = [
    { 
      title: 'Agents', 
      value: stats.totalAgents, 
      subtitle: 'agents enregistrés',
      icon: IconUsers, 
      color: 'blue', 
      page: 'agents' 
    },
    { 
      title: 'Rapports', 
      value: stats.totalRapports, 
      subtitle: "rapport(s) d'inspection",
      icon: IconFileText, 
      color: 'teal', 
      page: 'rapports' 
    },
    { 
      title: 'Recommandations', 
      value: stats.totalRecommandations, 
      subtitle: 'recommandation(s) émise(s)',
      icon: IconListCheck, 
      color: 'violet', 
      page: 'recommandations' 
    },
    { 
      title: 'Dossiers', 
      value: stats.totalDossiers, 
      subtitle: 'dossier(s) disciplinaire(s)',
      icon: IconGavel, 
      color: 'orange', 
      page: 'dossiers' 
    },
  ];

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        {cards.map((card) => (
          <Card
            key={card.title}
            withBorder
            radius="lg"
            p="md"
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigate?.(card.page)}
          >
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {card.title}
              </Text>
              <ThemeIcon color={card.color} variant="light" size="md">
                <card.icon size={20} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl" mt="md">
              {card.value}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {card.subtitle}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Carte supplémentaire pour le taux de réalisation */}
      <Card withBorder radius="lg" p="md" mt="md" bg={tauxRealisation >= 75 ? 'green.0' : tauxRealisation >= 50 ? 'yellow.0' : 'red.0'}>
        <Group justify="space-between">
          <Group>
            <ThemeIcon color="teal" variant="light" size="md">
              <IconTrendingUp size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Taux de réalisation global</Text>
              <Text fw={700} size="xl">{tauxRealisation.toFixed(1)}%</Text>
            </div>
          </Group>
          <Badge color={tauxRealisation >= 75 ? "green" : tauxRealisation >= 50 ? "yellow" : "red"} size="lg">
            {tauxRealisation >= 75 ? "Excellent" : tauxRealisation >= 50 ? "En progrès" : "Critique"}
          </Badge>
        </Group>
      </Card>
    </>
  );
}