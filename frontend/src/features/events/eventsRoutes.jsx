import React from 'react';
import EventsListPage from './EventsListPage';
import EventDetailPage from './EventDetailPage';
import EventCheckInPage from './EventCheckInPage';
import EventFormPage from './EventFormPage';
import EventStatsPage from './EventStatsPage';
import { registerFeature } from '../../app/routeRegistry';

const eventsRoutes = [
  {
    path: '/events',
    element: <EventsListPage />,
  },
  {
    path: '/events/new',
    element: <EventFormPage />,
  },
  {
    path: '/events/:id/edit',
    element: <EventFormPage />,
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
    path: '/events/stats',
    element: <EventStatsPage />,
  },
  {
    path: '/events/:id/stats',
    element: <EventStatsPage />,
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
      path: '/events/new',
      label: 'Create Event',
      officerOnly: true,
    },
    {
      path: '/events/checkin',
      label: 'Ticket Check-In',
      officerOnly: true,
    },
    {
      path: '/events/stats',
      label: 'Event Analytics',
      officerOnly: true,
    },
  ],
});

export default eventsRoutes;
