import React from 'react';
import EventsListPage from './EventsListPage';
import EventDetailPage from './EventDetailPage';
import { registerFeature } from '../../app/routeRegistry';

const eventsRoutes = [
  {
    path: '/events',
    element: <EventsListPage />,
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
