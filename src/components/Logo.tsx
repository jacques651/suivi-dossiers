import { Image, Group, Text, Box } from '@mantine/core';

interface LogoProps {
  size?: number;
  withText?: boolean;
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 40, withText = true, variant = 'light' }: LogoProps) {
  const filter = variant === 'light' ? 'brightness(0) invert(1)' : 'none';
  
  if (withText) {
    return (
      <Group gap="sm">
        <Image 
          src="/armoirie.jpeg" 
          alt="Armoiries du Burkina Faso"
          w={size}
          h={size}
          fit="contain"
          style={{ filter }}
        />
        <Box>
          <Text fw={700} size="sm" c={variant === 'light' ? 'white' : '#1b365d'}>
            BURKINA FASO
          </Text>
          <Text size="xs" c={variant === 'light' ? 'gray.3' : 'dimmed'}>
            La Patrie ou la Mort
          </Text>
        </Box>
      </Group>
    );
  }
  
  return (
    <Image 
      src="/armoirie.jpeg" 
      alt="Armoiries du Burkina Faso"
      w={size}
      h={size}
      fit="contain"
      style={{ filter }}
    />
  );
}