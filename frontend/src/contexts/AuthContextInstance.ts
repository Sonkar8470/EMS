import { createContext } from 'react';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  employeeId?: string;
  mobile?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: { name: string; email: string; password: string; mobile: string; role: string }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
