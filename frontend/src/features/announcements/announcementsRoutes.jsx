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
  ],
  routes: [
    { path: '/announcements', element: <AnnouncementsFeedPage /> },
    { path: '/announcements/compose', element: <ComposeAnnouncementPage /> },
    { path: '/announcements/archive', element: <AnnouncementsArchivePage /> },
  ],
});
