import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'admin' | 'supervisor';
export type SupervisorType = 'voice' | 'chat';

interface AuthContextType {
  isLoggedIn: boolean;
  role: UserRole;
  supervisorType: SupervisorType;
  setIsLoggedIn: (value: boolean) => void;
  setRole: (role: UserRole) => void;
  setSupervisorType: (type: SupervisorType) => void;
  login: (role: UserRole, supervisorType?: SupervisorType) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [role, setRole] = useState<UserRole>(() => (localStorage.getItem('role') as UserRole) || 'admin');
  const [supervisorType, setSupervisorType] = useState<SupervisorType>(() => (localStorage.getItem('supervisorType') as SupervisorType) || 'voice');

  useEffect(() => {
    localStorage.setItem('isLoggedIn', String(isLoggedIn));
    localStorage.setItem('role', role);
    localStorage.setItem('supervisorType', supervisorType);
  }, [isLoggedIn, role, supervisorType]);

  const login = (newRole: UserRole, newSupervisorType?: SupervisorType) => {
    setRole(newRole);
    if (newSupervisorType) setSupervisorType(newSupervisorType);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setRole('admin');
    setSupervisorType('voice');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('supervisorType');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, role, supervisorType, setIsLoggedIn, setRole, setSupervisorType, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
