import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './AppShell';
import OverviewPage from './OverviewPage';
import { getRegisteredRoutes } from './routeRegistry';

// Import feature routes so they register automatically
import '../features/auth/authRoutes';
import '../features/events/eventsRoutes';

export default function AppRoutes() {
  const registeredRoutes = getRegisteredRoutes();

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        {registeredRoutes.map((route, idx) => (
          <Route key={idx} path={route.path} element={route.element} />
        ))}
      </Route>
    </Routes>
  );
}
