import { ReactNode } from 'react';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from './LoginPage';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredPermission, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission, hasRole } = useAuth();

  if (isLoading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" color="#1b365d" />
      </Center>
    );
  }

  if (!user) {
    return <LoginPage onLogin={function (_email: string): Promise<boolean> {
        throw new Error('Function not implemented.');
    } } />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Center style={{ height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Accès non autorisé</h2>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </Center>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Center style={{ height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Accès non autorisé</h2>
          <p>Vous n'avez pas le rôle requis pour accéder à cette page.</p>
        </div>
      </Center>
    );
  }

  return <>{children}</>;
}