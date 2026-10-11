'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
    </AuthProvider>
  );
};
