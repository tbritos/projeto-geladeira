import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'operador' | 'visualizador';
export type ThemeMode = 'dark' | 'light';

export interface User {
  username: string;
  role: UserRole;
  email?: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  hasPermission: (requiredRole: UserRole) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  // Carregar tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
    
    // Carregar usuário salvo
    const currentUser = localStorage.getItem('currentUser');
    const userRole = localStorage.getItem('userRole') as UserRole || 'visualizador';
    if (currentUser) {
      setUser({ username: currentUser, role: userRole });
    }
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      'admin': 3,
      'operador': 2,
      'visualizador': 1,
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const value: AppContextType = {
    user,
    setUser: (newUser) => {
      setUser(newUser);
      if (newUser) {
        localStorage.setItem('currentUser', newUser.username);
        localStorage.setItem('userRole', newUser.role);
      } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
      }
    },
    theme,
    setTheme,
    toggleTheme,
    hasPermission,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de AppProvider');
  }
  return context;
};
