// src/components/Navbar.tsx
import { useState } from 'react';
import { 
  AppShell, 
  Stack, 
  Group, 
  Text, 
  UnstyledButton, 
  Tooltip, 
  Box,
  ScrollArea,
  rem,
  Avatar
} from '@mantine/core';
import { 
  IconDashboard, 
  IconRobot, 
  IconFileReport, 
  IconFolder, 
  IconBulb, 
  IconEyeCheck, 
  IconBooks, 
  IconHistory, 
  IconLogout
} from '@tabler/icons-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface NavbarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
  collapsed?: boolean;
}

export default function Navbar({ 
  activeTab, 
  onTabChange, 
  onLogout, 
  userName, 
  userRole,
  collapsed = false 
}: NavbarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <IconDashboard size={24} /> },
    { id: 'agents', label: 'Agents', icon: <IconRobot size={24} />, roles: ['admin', 'supervisor'] },
    { id: 'rapports', label: 'Rapports', icon: <IconFileReport size={24} /> },
    { id: 'dossiers', label: 'Dossiers', icon: <IconFolder size={24} /> },
    { id: 'recommandations', label: 'Recommandations', icon: <IconBulb size={24} /> },
    { id: 'suiviRecommandations', label: 'Suivi Recommandations', icon: <IconEyeCheck size={24} />, roles: ['admin', 'supervisor'] },
    { id: 'referentiels', label: 'Référentiels', icon: <IconBooks size={24} />, roles: ['admin'] },
    { id: 'logs', label: 'Logs', icon: <IconHistory size={24} />, roles: ['admin'] },
  ];

  // Filtrer les items selon le rôle utilisateur
  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = activeTab === item.id;
    
    return (
      <Tooltip
        label={collapsed ? item.label : ''}
        position="right"
        withArrow
        disabled={!collapsed}
        offset={15}
      >
        <UnstyledButton
          onClick={() => onTabChange(item.id)}
          onMouseEnter={() => setHovered(item.id)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'block',
            width: '100%',
            padding: collapsed ? rem(8) : rem(12),
            borderRadius: rem(8),
            color: isActive || hovered === item.id ? '#fff' : '#b4c7e7',
            backgroundColor: isActive 
              ? 'rgba(255, 255, 255, 0.15)' 
              : hovered === item.id 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <Group 
            gap="md" 
            justify={collapsed ? "center" : "flex-start"}
            wrap="nowrap"
          >
            <Box style={{ 
              color: isActive ? '#fff' : '#b4c7e7',
              transition: 'transform 0.2s ease',
              transform: hovered === item.id ? 'scale(1.1)' : 'scale(1)'
            }}>
              {item.icon}
            </Box>
            {!collapsed && (
              <Text 
                size="sm" 
                fw={isActive ? 600 : 500}
                style={{ 
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.label}
              </Text>
            )}
          </Group>
        </UnstyledButton>
      </Tooltip>
    );
  };

  const getRoleColor = () => {
    switch(userRole) {
      case 'admin': return '#ff6b6b';
      case 'supervisor': return '#51cf66';
      default: return '#74c0fc';
    }
  };

  const getRoleLabel = () => {
    switch(userRole) {
      case 'admin': return 'Administrateur';
      case 'supervisor': return 'Superviseur';
      default: return 'Utilisateur';
    }
  };

  return (
    <AppShell.Navbar
      style={{
        backgroundColor: '#1b365d',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header avec logo et nom */}
      {!collapsed && (
        <Box p="md" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Group gap="xs">
            <Avatar 
              src="/armoirie.jpeg" 
              alt="Armoiries"
              size="md"
              radius="sm"
            />
            <div>
              <Text size="sm" fw={700} c="white">Plateforme de Suivi</Text>
              <Text size="xs" c="#b4c7e7">Gestion des dossiers</Text>
            </div>
          </Group>
        </Box>
      )}

      {/* Navigation principale */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <Stack 
          gap="xs" 
          p={collapsed ? "xs" : "md"} 
          style={{ marginTop: collapsed ? 0 : rem(20) }}
        >
          {filteredNavItems.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </Stack>
      </ScrollArea>

      {/* Footer avec infos utilisateur et déconnexion */}
      <Box 
        style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: collapsed ? rem(8) : rem(16)
        }}
      >
        {!collapsed && (
          <Group gap="sm" mb="md">
            <Avatar 
              radius="xl"
              size="md"
              bg={getRoleColor()}
              c="white"
            >
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Text size="sm" fw={600} c="white" truncate>
                {userName}
              </Text>
              <Text size="xs" c="#b4c7e7">
                {getRoleLabel()}
              </Text>
            </div>
          </Group>
        )}

        {collapsed && (
          <Tooltip label={userName} position="right" withArrow>
            <Group justify="center" mb="md">
              <Avatar 
                radius="xl"
                size="md"
                bg={getRoleColor()}
                c="white"
              >
                {userName.charAt(0).toUpperCase()}
              </Avatar>
            </Group>
          </Tooltip>
        )}

        <UnstyledButton
          onClick={onLogout}
          style={{
            display: 'block',
            width: '100%',
            padding: collapsed ? rem(8) : rem(12),
            borderRadius: rem(8),
            color: '#ff8787',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 135, 135, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Group gap="md" justify={collapsed ? "center" : "flex-start"}>
            <IconLogout size={24} />
            {!collapsed && <Text size="sm" fw={500}>Déconnexion</Text>}
          </Group>
        </UnstyledButton>
      </Box>
    </AppShell.Navbar>
  );
}