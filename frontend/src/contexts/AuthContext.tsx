import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI, getSocket } from '../services/api';
import { AuthContext, type User} from './AuthContextInstance';

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        try {
          const socket = getSocket();
          const employeeId = parsedUser?.id || parsedUser?._id;
          if (employeeId) socket.emit('join', { employeeId: String(employeeId) });
        } catch {}
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("AuthContext: Starting login process...");
      const response = await authAPI.login({ email, password });
      console.log("AuthContext: Login API response:", response.data);
      
      const { token, user: userData } = response.data;
      
      console.log("AuthContext: Storing token and user data...");
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      try {
        const socket = getSocket();
        const employeeId = userData?.id || userData?._id;
        if (employeeId) socket.emit('join', { employeeId: String(employeeId) });
      } catch {}
      
      console.log("AuthContext: Login process completed. User:", userData);
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const register = async (userData: { name: string; email: string; password: string; mobile: string; role: string }) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
