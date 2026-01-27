import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  tier: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get('/api/auth/me');
      setUser(data.customer);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.customer);
  }

  async function register(email: string, password: string, name?: string) {
    const data = await api.post('/api/auth/register', { email, password, name });
    localStorage.setItem('token', data.token);
    setUser(data.customer);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  async function refreshUser() {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.customer);
    } catch {
      logout();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
