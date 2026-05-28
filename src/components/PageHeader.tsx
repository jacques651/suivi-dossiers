// src/components/PageHeader.tsx
import { Card, Group, Title, Text, Box, Image, Button } from '@mantine/core';
import { IconCategory } from '@tabler/icons-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showConfigButton?: boolean;
  onConfigClick?: () => void;
  rightContent?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  showConfigButton = false, 
  onConfigClick,
  rightContent 
}: PageHeaderProps) {
  return (
    <Card
      withBorder
      radius="lg"
      p="xl"
      style={{
        background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Décoration de fond */}
      <Box
        style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none'
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none'
        }}
      />

      <Group justify="space-between" align="center" wrap="wrap" gap="lg">
        <Group gap="xl" align="center">
          {/* Logo avec fond blanc */}
          <Box
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 12,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            <Image
              src="/armoirie.jpeg"
              alt="Armoiries du Burkina Faso"
              w={70}
              h={70}
              fit="contain"
            />
          </Box>

          {/* Titre et sous-titre */}
          <Box>
            <Title
              order={1}
              c="white"
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {title}
            </Title>
            {subtitle && (
              <Text
                c="gray.2"
                size="md"
                mt={4}
                style={{ fontWeight: 400 }}
              >
                {subtitle}
              </Text>
            )}
          </Box>
        </Group>

        {/* Contenu à droite */}
        {rightContent ? rightContent : (showConfigButton && (
          <Button
            variant="light"
            color="white"
            leftSection={<IconCategory size={18} />}
            onClick={onConfigClick}
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
            Configuration
          </Button>
        ))}
      </Group>
    </Card>
  );
}