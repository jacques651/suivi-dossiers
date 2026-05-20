import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface User {
  id: number;
  nom_utilisateur: string;
  email: string;
  nom?: string;
  prenom?: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const userData = await invoke<User>('verify_session', { token: savedToken });
          if (userData) {
            setUser(userData);
            setToken(savedToken);
          } else {
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('Erreur vérification session:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await invoke<{ success: boolean; token?: string; user?: User; message: string }>('login', {
        email,
        password,
        adresseIp: window.location.hostname,
      });

      if (response.success && response.token && response.user) {
        setUser(response.user);
        setToken(response.token);
        localStorage.setItem('auth_token', response.token);
        return { success: true, message: response.message };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: 'Erreur de connexion au serveur' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await invoke('logout', { token });
      } catch (error) {
        console.error('Erreur déconnexion:', error);
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('change_password', { token, oldPassword, newPassword });
      return true;
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, hasPermission, hasRole, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};  