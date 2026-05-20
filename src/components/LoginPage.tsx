import { useState } from 'react';
import { Card, TextInput, Button, Stack, Title, Text, Container, Paper, PasswordInput, Alert } from '@mantine/core';
import { IconUser, IconLock, IconLogin, IconAlertCircle } from '@tabler/icons-react';

// Définir l'interface des props
interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

// Utiliser l'interface dans le composant
export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const success = await onLogin(email, password);
    if (!success) {
      setError('Email ou mot de passe incorrect');
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1b365d 0%, #2a4a7a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Container size="sm">
        <Paper shadow="xl" radius="lg" p={0}>
          <Card withBorder radius="lg" p="xl" style={{ background: 'white' }}>
            <Stack align="center" gap="md" mb="xl">
              <Title order={2} c="#1b365d">Connexion</Title>
              <Text size="sm" c="dimmed">Suivi des Dossiers Disciplinaires</Text>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                {error && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                    {error}
                  </Alert>
                )}

                <TextInput
                  label="Email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  leftSection={<IconUser size={16} />}
                  required
                />

                <PasswordInput
                  label="Mot de passe"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  leftSection={<IconLock size={16} />}
                  required
                />

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  variant="gradient"
                  gradient={{ from: '#1b365d', to: '#2a4a7a' }}
                  leftSection={<IconLogin size={16} />}
                >
                  Se connecter
                </Button>
              </Stack>
            </form>
          </Card>
        </Paper>
      </Container>
    </div>
  );
}