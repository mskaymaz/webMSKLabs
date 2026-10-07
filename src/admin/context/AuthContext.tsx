import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types/admin';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string, role?: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const FRONTEND_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'messages.read', 'messages.reply', 'messages.write', 'messages.delete',
    'comments.read', 'comments.approve', 'comments.delete',
    'posts.read', 'posts.create', 'posts.write', 'posts.publish', 'media.upload',
    'settings.manage'
  ],
  EDITOR: [
    'comments.read', 'comments.approve',
    'posts.read', 'posts.create', 'posts.write', 'posts.publish', 'media.upload'
  ],
  SUPPORT: [
    'messages.read', 'messages.reply', 'messages.write', 'comments.read'
  ]
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  hasPermission: () => false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_jwt'));
  const [user, setUser] = useState<AdminUser | null>(() => {
    const username = localStorage.getItem('admin_username');
    const savedToken = localStorage.getItem('admin_jwt');
    const role = localStorage.getItem('admin_role') || 'SUPER_ADMIN';
    return savedToken && username ? { username, role, token: savedToken } : null;
  });

  const login = (newToken: string, username: string, role = 'SUPER_ADMIN') => {
    localStorage.setItem('admin_jwt', newToken);
    localStorage.setItem('admin_username', username);
    localStorage.setItem('admin_role', role);
    setToken(newToken);
    setUser({ username, role, token: newToken });
  };

  const logout = () => {
    localStorage.removeItem('admin_jwt');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_role');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.role || !permission) return false;
    const permissions = FRONTEND_ROLE_PERMISSIONS[user.role] || [];
    if (permissions.includes('*')) return true;
    if (permissions.includes(permission)) return true;
    if (permission === 'messages.reply' && permissions.includes('messages.write')) return true;
    return false;
  };

  useEffect(() => {
    if (token && !user) {
      const savedUser = localStorage.getItem('admin_username') || 'admin';
      const savedRole = localStorage.getItem('admin_role') || 'SUPER_ADMIN';
      setUser({ username: savedUser, role: savedRole, token });
    }
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
