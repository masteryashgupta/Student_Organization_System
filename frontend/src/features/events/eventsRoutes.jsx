import React from 'react';
import EventsListPage from './EventsListPage';
import EventDetailPage from './EventDetailPage';
import EventCheckInPage from './EventCheckInPage';
import EventFormPage from './EventFormPage';
import EventStatsPage from './EventStatsPage';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { registerFeature } from '../../app/routeRegistry';

const eventsRoutes = [
  {
    path: '/events',
    element: <EventsListPage />,
  },
  {
    path: '/events/new',
    element: (
      <ProtectedRoute officerOnly>
        <EventFormPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:id/edit',
    element: (
      <ProtectedRoute officerOnly>
        <EventFormPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/checkin',
    element: (
      <ProtectedRoute volunteerOnly>
        <EventCheckInPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:id/checkin',
    element: (
      <ProtectedRoute volunteerOnly>
        <EventCheckInPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/stats',
    element: (
      <ProtectedRoute officerOnly>
        <EventStatsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:id/stats',
    element: (
      <ProtectedRoute officerOnly>
        <EventStatsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/:id',
    element: <EventDetailPage />,
  },
];

registerFeature({
  id: 'events',
  name: 'Events & Ticketing',
  routes: eventsRoutes,
  navItems: [
    {
      path: '/events',
      label: 'Events',
    },
  ],
});

export default eventsRoutes;
