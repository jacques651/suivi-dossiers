// src/components/DashboardStatCards.tsx
import { SimpleGrid, Card, Text, Group, ThemeIcon, Box, Progress, Badge } from '@mantine/core';
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

  // Pourcentages pour les progress bars
  const pourcentageRecommandationsRealisees = stats.totalRecommandations > 0 
    ? Math.round((stats.recommandationsRealisees / stats.totalRecommandations) * 100) 
    : 0;

  const cards = [
    { 
      title: 'Agents', 
      value: stats.totalAgents, 
      subtitle: 'agents enregistrés',
      icon: IconUsers, 
      color: 'blue', 
      page: 'agents',
      borderColor: 'blue'
    },
    { 
      title: 'Rapports', 
      value: stats.totalRapports, 
      subtitle: "rapport(s) d'inspection",
      icon: IconFileText, 
      color: 'teal', 
      page: 'rapports',
      borderColor: 'teal'
    },
    { 
      title: 'Recommandations', 
      value: stats.totalRecommandations, 
      subtitle: 'recommandation(s) émise(s)',
      icon: IconListCheck, 
      color: 'violet', 
      page: 'recommandations',
      borderColor: 'violet',
      showProgress: true,
      progressValue: pourcentageRecommandationsRealisees,
      progressColor: 'green'
    },
    { 
      title: 'Dossiers', 
      value: stats.totalDossiers, 
      subtitle: 'dossier(s) disciplinaire(s)',
      icon: IconGavel, 
      color: 'orange', 
      page: 'dossiers',
      borderColor: 'orange'
    },
  ];

  return (
    <>
      <SimpleGrid 
        cols={{ base: 1, xs: 2, md: 4 }} 
        spacing="md"
        verticalSpacing="md"
      >
        {cards.map((card) => (
          <Card 
            key={card.title} 
            withBorder 
            radius="lg" 
            shadow="sm" 
            p="md" 
            style={{ 
              borderLeft: `4px solid var(--mantine-color-${card.borderColor}-6)`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => onNavigate?.(card.page)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }}
          >
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size="lg" radius="md" color={card.color} variant="light">
                <card.icon size={20} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {card.title}
                </Text>
                <Text fw={700} size="xl" lh={1.2}>
                  {card.value}
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {card.subtitle}
                </Text>
                {card.showProgress && (
                  <Progress value={card.progressValue} size="xs" radius="xl" color={card.progressColor} mt={6} />
                )}
              </Box>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Carte supplémentaire pour le taux de réalisation - style modernisé */}
      <Card 
        withBorder 
        radius="lg" 
        shadow="sm" 
        p="md" 
        mt="md"
        style={{ 
          borderLeft: `4px solid var(--mantine-color-${tauxRealisation >= 75 ? 'green' : tauxRealisation >= 50 ? 'yellow' : 'red'}-6)`,
          background: tauxRealisation >= 75 ? 'linear-gradient(135deg, var(--mantine-color-green-0) 0%, var(--mantine-color-green-1) 100%)' 
            : tauxRealisation >= 50 ? 'linear-gradient(135deg, var(--mantine-color-yellow-0) 0%, var(--mantine-color-yellow-1) 100%)'
            : 'linear-gradient(135deg, var(--mantine-color-red-0) 0%, var(--mantine-color-red-1) 100%)'
        }}
      >
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="md" wrap="nowrap">
            <ThemeIcon 
              size="lg" 
              radius="md" 
              color={tauxRealisation >= 75 ? "green" : tauxRealisation >= 50 ? "yellow" : "red"} 
              variant="light"
            >
              <IconTrendingUp size={20} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Taux de réalisation global</Text>
              <Group gap="xs" align="baseline">
                <Text fw={800} size="xl" style={{ fontSize: '2rem' }}>
                  {tauxRealisation.toFixed(1)}%
                </Text>
                <Text size="sm" c="dimmed">des recommandations</Text>
              </Group>
            </Box>
          </Group>
          
          <Badge 
            size="lg" 
            radius="md"
            color={tauxRealisation >= 75 ? "green" : tauxRealisation >= 50 ? "yellow" : "red"}
            variant="light"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            {tauxRealisation >= 75 ? "Excellent" : tauxRealisation >= 50 ? "En progrès" : "Critique"}
          </Badge>
        </Group>

        {/* Progress bar globale */}
        <Progress 
          value={tauxRealisation} 
          size="sm" 
          radius="xl" 
          color={tauxRealisation >= 75 ? "green" : tauxRealisation >= 50 ? "yellow" : "red"} 
          mt="md"
        />
      </Card>
    </>
  );
}