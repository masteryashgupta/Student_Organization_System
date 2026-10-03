import React from 'react';
import EventsListPage from './EventsListPage';
import EventDetailPage from './EventDetailPage';
import EventCheckInPage from './EventCheckInPage';
import { registerFeature } from '../../app/routeRegistry';

const eventsRoutes = [
  {
    path: '/events',
    element: <EventsListPage />,
  },
  {
    path: '/events/checkin',
    element: <EventCheckInPage />,
  },
  {
    path: '/events/:id/checkin',
    element: <EventCheckInPage />,
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
    {
      path: '/events/checkin',
      label: 'Ticket Check-In',
      officerOnly: true,
    },
  ],
});

export default eventsRoutes;
