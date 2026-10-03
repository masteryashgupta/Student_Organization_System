import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import AnnouncementsFeedPage from './AnnouncementsFeedPage';
import ComposeAnnouncementPage from './ComposeAnnouncementPage';
import AnnouncementsArchivePage from './AnnouncementsArchivePage';

registerFeature({
  id: 'announcements',
  name: 'Announcements',
  navItems: [
    { path: '/announcements', label: 'Announcements' },
    { path: '/announcements/compose', label: '+ Compose Notice', officerOnly: true },
    { path: '/announcements/archive', label: 'Archive' },
  ],
  routes: [
    { path: '/announcements', element: <AnnouncementsFeedPage /> },
    { path: '/announcements/compose', element: <ComposeAnnouncementPage /> },
    { path: '/announcements/archive', element: <AnnouncementsArchivePage /> },
  ],
});
