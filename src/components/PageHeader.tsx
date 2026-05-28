// src/components/PageHeader.tsx
import { Card, Title, Text, Box, Image, Stack, Button } from '@mantine/core';
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
      radius="md"
      p="md"
      style={{
        background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Décoration de fond plus petites */}
      <Box
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none'
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: -20,
          left: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none'
        }}
      />

      {/* Contenu centré - plus compact */}
      <Stack gap="sm" align="center" justify="center" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo avec fond blanc - plus petit */}
        <Box
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <Image
            src="/armoirie.jpeg"
            alt="Armoiries du Burkina Faso"
            w={50}
            h={50}
            fit="contain"
          />
        </Box>

        {/* Ministère et Service centrés - texte plus petit */}
        <Stack gap={0} align="center">
          <Text
            c="gray.1"
            size="lg"
            fw={600}
            style={{
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              textAlign: 'center'
            }}
          >
            MINISTÈRE DE LA SÉCURITÉ
          </Text>
          <Text
            c="gray.3"
            size="xs"
            fw={500}
            style={{
              fontStyle: 'italic',
              textAlign: 'center'
            }}
          >
            INSPECTION TECHNIQUE DES SERVICES
          </Text>
        </Stack>

        {/* Titre principal centré - plus compact */}
        <Box>
          <Title
            order={2}
            c="white"
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              margin: 0,
              textAlign: 'center'
            }}
          >
            {title}
          </Title>
          {subtitle && (
            <Text
              c="gray.3"
              size="sm"
              mt={2}
              style={{ 
                fontWeight: 500,
                textAlign: 'center'
              }}
            >
              {subtitle}
            </Text>
          )}
        </Box>
      </Stack>

      {/* Bouton de configuration si nécessaire (en absolu) */}
      {(showConfigButton || rightContent) && (
        <Box
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2
          }}
        >
          {rightContent ? rightContent : (
            <Button
              variant="light"
              color="white"
              size="xs"
              leftSection={<IconCategory size={14} />}
              onClick={onConfigClick}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Configuration
            </Button>
          )}
        </Box>
      )}
    </Card>
  );
}