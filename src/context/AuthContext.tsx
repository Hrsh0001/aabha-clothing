'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'guest' | 'customer' | 'admin';

export interface UserProfile {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  demoCode?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  adminToken: string | null;
  customerToken: string | null;
  isInitialized: boolean;
  loginCustomer: (email: string, password: string) => Promise<AuthResponse>;
  signupCustomer: (name: string, email: string, phone: string, password: string) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<AuthResponse>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<AuthResponse>;
  loginAsCustomerLegacy: (name: string, phone: string) => void;
  loginAsAdmin: (secretKey: string, email?: string) => Promise<boolean>;
  logout: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 1. Check Customer JWT Token & Session
        const savedCustomerToken = localStorage.getItem('aabha_customer_jwt');
        if (savedCustomerToken) {
          try {
            const res = await fetch('/api/auth', {
              headers: { Authorization: `Bearer ${savedCustomerToken}` },
            });
            const data = await res.json();
            if (data.success && data.user) {
              setUser(data.user);
              setCustomerToken(savedCustomerToken);
            } else {
              localStorage.removeItem('aabha_customer_jwt');
            }
          } catch (e) {
            // fallback to local stored profile if network drops
            const savedProfile = localStorage.getItem('aabha_customer_session');
            if (savedProfile) {
              setUser(JSON.parse(savedProfile));
              setCustomerToken(savedCustomerToken);
            }
          }
        } else {
          // Check quick session
          const savedProfile = localStorage.getItem('aabha_customer_session');
          if (savedProfile) {
            setUser(JSON.parse(savedProfile));
          }
        }

        // 2. Check Admin JWT Token
        const savedAdminToken = localStorage.getItem('aabha_admin_jwt');
        if (savedAdminToken) {
          try {
            const res = await fetch('/api/admin/auth', {
              headers: { Authorization: `Bearer ${savedAdminToken}` },
            });
            const data = await res.json();
            if (data.success && data.valid) {
              setAdminToken(savedAdminToken);
            } else {
              localStorage.removeItem('aabha_admin_jwt');
            }
          } catch (tokenErr) {
            setAdminToken(savedAdminToken);
          }
        }
      } catch (e) {
        console.warn('Auth initialization notice:', e);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Customer Sign In via Email & Password
  const loginCustomer = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        setUser(data.user);
        setCustomerToken(data.token);
        localStorage.setItem('aabha_customer_jwt', data.token);
        localStorage.setItem('aabha_customer_session', JSON.stringify(data.user));
        setAuthModalOpen(false);
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Invalid email or password' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during sign in' };
    }
  };

  // Customer Sign Up via Name, Email, Phone, Password
  const signupCustomer = async (
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', name, email, phone, password }),
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        setUser(data.user);
        setCustomerToken(data.token);
        localStorage.setItem('aabha_customer_jwt', data.token);
        localStorage.setItem('aabha_customer_session', JSON.stringify(data.user));
        setAuthModalOpen(false);
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Failed to create account' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during sign up' };
    }
  };

  // Customer Forgot Password
  const forgotPassword = async (email: string): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot-password', email }),
      });
      const data = await res.json();
      return {
        success: data.success,
        message: data.message,
        error: data.error,
        demoCode: data.demoCode,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Request failed' };
    }
  };

  // Customer Reset Password
  const resetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', email, code, newPassword }),
      });
      const data = await res.json();
      return {
        success: data.success,
        message: data.message,
        error: data.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset failed' };
    }
  };

  // Quick fallback login for checkout/guest phone
  const loginAsCustomerLegacy = (name: string, phone: string) => {
    const profile: UserProfile = {
      name: name.trim(),
      phone: phone.trim(),
      role: 'customer',
    };
    setUser(profile);
    localStorage.setItem('aabha_customer_session', JSON.stringify(profile));
    setAuthModalOpen(false);
  };

  // Admin Login via JWT
  const loginAsAdmin = async (secretKey: string, email?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || '',
          username: email || '',
          pin: secretKey,
          password: secretKey,
        }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setAdminToken(data.token);
        localStorage.setItem('aabha_admin_jwt', data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin login error:', err);
      return false;
    }
  };

  const logout = () => {
    if (adminToken) {
      setAdminToken(null);
      localStorage.removeItem('aabha_admin_jwt');
    }
    if (user && user.role === 'customer') {
      setUser(null);
      setCustomerToken(null);
      localStorage.removeItem('aabha_customer_jwt');
      localStorage.removeItem('aabha_customer_session');
    }
  };

  const isAdmin = Boolean(adminToken);
  const role: UserRole = isAdmin ? 'admin' : user ? user.role : 'guest';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        adminToken,
        customerToken,
        isInitialized,
        loginCustomer,
        signupCustomer,
        forgotPassword,
        resetPassword,
        loginAsCustomerLegacy,
        loginAsAdmin,
        logout,
        authModalOpen,
        setAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
