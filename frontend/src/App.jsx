import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import QueryProvider from './lib/QueryProvider';
import { AuthProvider } from './lib/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import AppRoutes from './app/routes';

export default function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
