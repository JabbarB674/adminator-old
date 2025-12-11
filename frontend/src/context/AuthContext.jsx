import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      if (authService.isAuthenticated()) {
        setUser(authService.getUser());
        setAccount(authService.getAccount());
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = (data) => {
    authService.saveAuth(data);
    setUser(data.user);
    setAccount(data.account);
  };

  const updateAccount = (newAccount) => {
    const token = authService.getToken();
    const user = authService.getUser();
    authService.saveAuth({ token, user, account: newAccount });
    setAccount(newAccount);
  };

  const refreshUser = async () => {
      const data = await authService.refreshProfile();
      if (data) {
          setUser(data.user);
          // Also update token if it changed
          if (data.token) {
              authService.saveAuth(data);
          }
      }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setAccount(null);
  };

  const value = {
    user,
    account,
    loading,
    login,
    logout,
    updateAccount,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
