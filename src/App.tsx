// src/App.tsx
import { useState, useEffect } from 'react';
import { MantineProvider, AppShell, Box, Text, Burger, Group, LoadingOverlay, Image, Tooltip } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';
import { invoke } from '@tauri-apps/api/core';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import LogsManager from './components/referentiels/LogsManager';

import SuiviRecommandationsManager from './pages/SuiviRecommandationsManager';
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
  user?: { 
    nom_utilisateur: string;
    role?: string;
  };
  message?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpened, setMobileOpened] = useState(false);
  const [desktopOpened, setDesktopOpened] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');

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
          setUserName(result.nom_utilisateur || 'Administrateur');
          setUserRole(result.role || 'admin');
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
        setUserRole(result.user?.role || 'user');
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
    setUserRole('user');
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard onNavigate={(page) => setActiveTab(page)} />;
      case 'agents': return <AgentManager />;
      case 'rapports': return <Rapports />;
      case 'dossiers': return <Dossiers />;
      case 'recommandations': return <Recommandations />;
      case 'suiviRecommandations': return <SuiviRecommandationsManager />;
      case 'referentiels': return <Referentiels />;
      case 'logs': return <LogsManager />;
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
          width: desktopOpened ? 280 : 70,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: false },
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
                color="white"
              />
              <Burger 
                opened={desktopOpened} 
                onClick={() => setDesktopOpened(!desktopOpened)} 
                visibleFrom="sm" 
                size="sm" 
                color="white"
              />
              <Image 
                src="/armoirie.jpeg" 
                alt="Armoiries du Burkina Faso"
                w={40}
                h={40}
                fit="contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <Box visibleFrom="sm">
                <Text size="xl" fw={700} c="white">Suivi Dossiers</Text>
                <Text size="xs" c="gray.3">Suivi des Inspections et Dossiers Disciplinaires</Text>
              </Box>
              <Box hiddenFrom="sm">
                <Text size="md" fw={700} c="white">Suivi Dossiers</Text>
              </Box>
            </Group>
            
            <Group gap="md">
              <Tooltip label={userName} position="bottom" withArrow>
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" fw={600} c="white">
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </Box>
              </Tooltip>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar style={{ backgroundColor: '#1b365d' }}>
          <Navbar
            activeTab={activeTab}
            onTabChange={(tabId) => {
              setActiveTab(tabId);
              setMobileOpened(false);
            }}
            onLogout={handleLogout}
            userName={userName}
            userRole={userRole}
            collapsed={!desktopOpened}
          />
        </AppShell.Navbar>

        <AppShell.Main style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
          {renderContent()}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;