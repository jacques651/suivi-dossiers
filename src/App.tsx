import { useState, useEffect } from 'react';
import { MantineProvider, AppShell, Box, Text, Burger, Group, LoadingOverlay, Image } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import { invoke } from '@tauri-apps/api/core';
import LoginPage from './components/LoginPage';

import SuiviRecommandationsManager from './pages/SuiviRecommandationsManager';
import { 
  IconDashboard, IconReport, IconUsers, IconFileText, IconListCheck,
  IconLogout, IconDatabase, IconChecklist
} from '@tabler/icons-react';
import Dashboard from './pages/Dashboard';
import AgentManager from './pages/agents/AgentManager';
import Rapports from './pages/Rapports';
import Dossiers from './pages/Dossiers';
import Recommandations from './pages/Recommandations';
import Referentiels from './pages/Referentiels';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: { nom_utilisateur: string };
  message?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpened, setMobileOpened] = useState(false);
  const [desktopOpened, setDesktopOpened] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const result = await invoke<any>('verify_session', { token });
        if (result) {
          setIsAuthenticated(true);
          setUserName('Administrateur');
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await invoke<LoginResponse>('login', { email, password, adresseIp: '' });
      if (result.success && result.token) {
        localStorage.setItem('auth_token', result.token);
        setIsAuthenticated(true);
        setUserName(result.user?.nom_utilisateur || 'Utilisateur');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur login:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        await invoke('logout', { token });
      } catch (error) {
        console.error('Erreur déconnexion:', error);
      }
    }
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setUserName('');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: IconDashboard },
    { id: 'agents', label: 'Agents', icon: IconUsers },
    { id: 'rapports', label: 'Rapports', icon: IconReport },
    { id: 'dossiers', label: 'Dossiers', icon: IconFileText },
    { id: 'recommandations', label: 'Recommandations', icon: IconListCheck },
    { id: 'suiviRecommandations', label: 'Suivi Recommandations', icon: IconChecklist },
    { id: 'referentiels', label: 'Référentiels', icon: IconDatabase },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard onNavigate={(page) => setActiveTab(page)} />;
      case 'agents': return <AgentManager />;
      case 'rapports': return <Rapports />;
      case 'dossiers': return <Dossiers />;
      case 'recommandations': return <Recommandations />;
      case 'suiviRecommandations': return <SuiviRecommandationsManager />;
      case 'referentiels': return <Referentiels />;
      default: return <Dashboard onNavigate={(page) => setActiveTab(page)} />;
    }
  };

  if (loading) {
    return (
      <MantineProvider theme={theme} defaultColorScheme="light">
        <LoadingOverlay visible={true} />
      </MantineProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications />
        <LoginPage onLogin={handleLogin} />
      </MantineProvider>
    );
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications />
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 280,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger 
                opened={mobileOpened} 
                onClick={() => setMobileOpened(!mobileOpened)} 
                hiddenFrom="sm" 
                size="sm" 
              />
              <Burger 
                opened={desktopOpened} 
                onClick={() => setDesktopOpened(!desktopOpened)} 
                visibleFrom="sm" 
                size="sm" 
              />
              {/* Logo des armoiries du Burkina Faso */}
              <Image 
                src="/armoirie.jpeg" 
                alt="Armoiries du Burkina Faso"
                w={40}
                h={40}
                fit="contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <Box>
                <Text size="xl" fw={700} c="white">Suivi Dossiers</Text>
                <Text size="xs" c="gray.3" visibleFrom="sm">| Suivi des Inspections et Dossiers Disciplinaires</Text>
              </Box>
            </Group>
            
            <Group gap="md">
              <Text c="white" size="sm">Bienvenue, {userName}</Text>
              <Box 
                onClick={handleLogout} 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <IconLogout size={20} color="white" />
              </Box>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          {menuItems.map((item) => (
            <Box
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpened(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: activeTab === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                marginBottom: 4,
                color: 'white',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <item.icon size={22} stroke={1.5} />
              <Text size="md" fw={500}>{item.label}</Text>
            </Box>
          ))}
          
          <Box mt="auto" pt="xl">
            <Box
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 8,
                cursor: 'pointer',
                color: '#ff6b6b',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,107,107,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <IconLogout size={22} stroke={1.5} />
              <Text size="md" fw={500}>Déconnexion</Text>
            </Box>
          </Box>
        </AppShell.Navbar>

        <AppShell.Main>
          {renderContent()}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;