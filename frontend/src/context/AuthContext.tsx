import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/axios';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface AuthContextType {
  user: User | null;
  role: Role | null;
  permissions: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data: any = await api.get('/auth/me');
      setUser(data.user);
      setRole(data.role);
      setPermissions(data.permissions || []);
    } catch (error) {
      localStorage.clear();
      setUser(null);
      setRole(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response: any = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
    setRole(response.user.role);
    setPermissions(response.user.permissions || []);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch (e) {
      // Ignore logout errors
    } finally {
      localStorage.clear();
      setUser(null);
      setRole(null);
      setPermissions([]);
      window.location.href = '/login';
    }
  };

  const hasPermission = (permissionName: string) => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.includes(permissionName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        isLoading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
