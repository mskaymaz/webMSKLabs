import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types/admin';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_jwt'));
  const [user, setUser] = useState<AdminUser | null>(() => {
    const username = localStorage.getItem('admin_username');
    const savedToken = localStorage.getItem('admin_jwt');
    return savedToken && username ? { username, role: 'SUPER_ADMIN', token: savedToken } : null;
  });

  const login = (newToken: string, username: string) => {
    localStorage.setItem('admin_jwt', newToken);
    localStorage.setItem('admin_username', username);
    setToken(newToken);
    setUser({ username, role: 'SUPER_ADMIN', token: newToken });
  };

  const logout = () => {
    localStorage.removeItem('admin_jwt');
    localStorage.removeItem('admin_username');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token && !user) {
      const savedUser = localStorage.getItem('admin_username') || 'admin';
      setUser({ username: savedUser, role: 'SUPER_ADMIN', token });
    }
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
