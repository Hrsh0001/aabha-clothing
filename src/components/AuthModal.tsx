'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AccountDrawer } from './Drawers';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen } = useAuth();

  return (
    <AccountDrawer
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      onNavigateOrders={() => {
        setAuthModalOpen(false);
        if (typeof window !== 'undefined') {
          window.location.href = '/my-orders';
        }
      }}
      onNavigateShop={() => {
        setAuthModalOpen(false);
        if (typeof window !== 'undefined') {
          if (window.location.pathname !== '/') {
            window.location.href = '/#new-arrivals';
          } else {
            const el = document.getElementById('new-arrivals');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        }
      }}
      onNavigateContact={() => {
        setAuthModalOpen(false);
        if (typeof window !== 'undefined') {
          if (window.location.pathname !== '/') {
            window.location.href = '/#contact';
          } else {
            const el = document.getElementById('contact');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        }
      }}
    />
  );
};
